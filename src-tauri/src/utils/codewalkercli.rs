use once_cell::sync::Lazy;
use serde::Serialize;
use std::{
    path::Path,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

const DEFAULT_GTA_PATH: &str = "C:/Program Files/Rockstar Games/Grand Theft Auto V";
const CACHE_INITIALIZED_MSG: &str = "[INFO] Cache initialized";
const PROCESSING_COMMAND_MSG: &str = "[CMD]";
const COMMAND_COMPLETE_MSG: &str = "[CMD] Command completed";
const CLI_ERROR: &str = "[TAURI ERROR]";
const CLI_INFO: &str = "[TAURI INFO]";

#[derive(Debug, thiserror::Error)]
pub enum CliError {
    #[error("CLI is already running")]
    AlreadyRunning,
    #[error("GTA V path not found")]
    PathNotFound,
    #[error("GTA5.exe not found in the specified directory")]
    ExecutableNotFound,
    #[error("CLI is not running")]
    NotRunning,
    #[error("CLI is not ready")]
    NotReady,
    #[error("CLI is busy processing")]
    Busy,
    #[error("Lock acquisition failed: {0}")]
    LockError(String),
    #[error("Command failed: {0}")]
    CommandError(String),
}

impl Serialize for CliError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

struct CliProcess {
    command: Option<CommandChild>,
    ready: bool,
    processing_command: bool,
}

impl CliProcess {
    fn new(command: CommandChild) -> Self {
        Self {
            command: Some(command),
            ready: false,
            processing_command: false,
        }
    }

    fn set_ready(&mut self) {
        self.ready = true;
    }

    fn set_processing(&mut self, processing: bool) {
        self.processing_command = processing;
    }

    fn is_ready(&self) -> bool {
        self.ready
    }

    async fn start(gta_path: String, app_handle: &AppHandle) -> Result<Self, CliError> {
        let gta_path = if Path::new(&gta_path).exists() {
            gta_path
        } else if Path::new(DEFAULT_GTA_PATH).exists() {
            DEFAULT_GTA_PATH.to_string()
        } else {
            return Err(CliError::PathNotFound);
        };

        let exe_path = Path::new(&gta_path).join("GTA5.exe");
        if !exe_path.exists() {
            return Err(CliError::ExecutableNotFound);
        }

        let shell = app_handle.shell();
        let (mut rx, command) = shell
            .command("CodeWalkerCli")
            .env("CLIMODE", "PIPED")
            .env("GTA_PATH", gta_path)
            .spawn()
            .map_err(|e| CliError::CommandError(e.to_string()))?;

        let process = Self::new(command);

        // Spawn the event handling task
        let app_handle = app_handle.clone();
        let cli_clone = Arc::clone(&CLI_PROCESS);
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        let line_str = String::from_utf8_lossy(&line);
                        let mut guard = cli_clone.lock().unwrap();
                        if let Some(cli) = guard.as_mut() {
                            handle_stdout(line_str.to_string(), &app_handle, cli);
                        }
                    }
                    CommandEvent::Stderr(line) => {
                        let line_str = String::from_utf8_lossy(&line);
                        println!("{} stderr: {}", CLI_ERROR, line_str);
                        let _ = app_handle.emit("cli-error", line_str.to_string());
                    }
                    CommandEvent::Error(error) => {
                        println!("{} Process error: {}", CLI_ERROR, error);
                        let _ = app_handle.emit("cli-error", error.to_string());
                    }
                    CommandEvent::Terminated(status) => {
                        println!(
                            "{} Process terminated ({})",
                            CLI_INFO,
                            status.code.unwrap_or(-1)
                        );
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(process)
    }

    fn send_command(&mut self, command: String) -> Result<(), CliError> {
        if !self.ready {
            return Err(CliError::NotReady);
        }
        if self.processing_command {
            return Err(CliError::Busy);
        }

        if let Some(cmd) = &mut self.command {
            cmd.write(format!("{}\n", command).as_bytes())
                .map_err(|e| CliError::CommandError(e.to_string()))?;

            self.set_processing(true);
            Ok(())
        } else {
            Err(CliError::NotRunning)
        }
    }

    fn stop(&mut self) -> Result<(), CliError> {
        if let Some(cmd) = self.command.take() {
            cmd.kill()
                .map_err(|e| CliError::CommandError(e.to_string()))?;
            Ok(())
        } else {
            Err(CliError::NotRunning)
        }
    }
}

static CLI_PROCESS: Lazy<Arc<Mutex<Option<CliProcess>>>> = Lazy::new(|| Arc::new(Mutex::new(None)));
fn handle_stdout(line_str: String, app_handle: &AppHandle, cli: &mut CliProcess) {
    app_handle
        .emit("cli-output", line_str.to_string())
        .unwrap_or_default();

    // Only log non-empty lines
    if !line_str.trim().is_empty() {
        println!("-{}", line_str);
    }

    if !cli.is_ready() && line_str.contains(CACHE_INITIALIZED_MSG) {
        println!("{} CLI Ready", CLI_INFO);
        cli.set_ready();
        let _ = app_handle.emit("cli-ready", true);
    } else if line_str.contains(COMMAND_COMPLETE_MSG) {
        println!("{} Command complete", CLI_INFO);
        cli.set_processing(false);
        let _ = app_handle.emit("cli-command-complete", true);
    } else if line_str.contains(PROCESSING_COMMAND_MSG) {
        println!("{} Processing command", CLI_INFO);
        cli.set_processing(true);
    }
}

#[tauri::command]
pub async fn start_codewalker(gta_path: String, app_handle: AppHandle) -> Result<(), CliError> {
    println!("{} Checking if process is already running...", CLI_INFO);
    {
        let guard = CLI_PROCESS
            .lock()
            .map_err(|e| CliError::LockError(e.to_string()))?;

        if guard.is_some() {
            println!("{} Process already running", CLI_ERROR);
            return Err(CliError::AlreadyRunning);
        }
    }

    println!("{} Starting process...", CLI_INFO);
    let process = CliProcess::start(gta_path, &app_handle).await?;

    let mut guard = CLI_PROCESS
        .lock()
        .map_err(|e| CliError::LockError(e.to_string()))?;

    *guard = Some(process);
    println!("{} Process started", CLI_INFO);
    Ok(())
}

#[tauri::command]
pub async fn send_command(command: String) -> Result<(), CliError> {
    println!("{} Executing: {}", CLI_INFO, command);

    let cli_process = Arc::clone(&CLI_PROCESS);
    let mut guard = cli_process
        .lock()
        .map_err(|e| CliError::LockError(format!("{} {}", CLI_ERROR, e)))?;

    let cli = guard.as_mut().ok_or(CliError::NotRunning)?;

    cli.send_command(command)?;
    Ok(())
}

#[tauri::command]
pub async fn stop_codewalker() -> Result<(), CliError> {
    println!("{} Stopping process...", CLI_INFO);

    let cli_process = Arc::clone(&CLI_PROCESS);
    let mut guard = cli_process
        .lock()
        .map_err(|e| CliError::LockError(format!("{} {}", CLI_ERROR, e)))?;

    match guard.take() {
        Some(mut cli) => {
            cli.stop()?;
            println!("{} Process stopped", CLI_INFO);
            Ok(())
        }
        None => {
            println!("{} No process was running", CLI_INFO);
            Ok(())
        }
    }
}
