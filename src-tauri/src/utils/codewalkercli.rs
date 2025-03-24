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

#[derive(Debug, Clone)]
struct CommandResult {
    output: Vec<String>,
    complete: bool,
    start_index: Option<usize>,
    end_index: Option<usize>,
}

impl CommandResult {
    fn new() -> Self {
        Self {
            output: Vec::new(),
            complete: false,
            start_index: None,
            end_index: None,
        }
    }
}

const DEFAULT_GTA_PATH: &str = "C:/Program Files/Rockstar Games/Grand Theft Auto V";
const CACHE_INITIALIZED_MSG: &str = "[INFO] Cache initialized";
const PROCESSING_COMMAND_MSG: &str = "[CMD]";
const COMMAND_COMPLETE_MSG: &str = "[CMD] Command completed";
const OUTPUT_START_MSG: &str = "[OUTPUT_START]";
const OUTPUT_END_MSG: &str = "[OUTPUT_END]";
const CLI_ERROR: &str = "[TAURI ERROR]";
const CLI_INFO: &str = "[TAURI INFO]";

static CURRENT_COMMAND: Lazy<Arc<Mutex<CommandResult>>> = Lazy::new(|| Arc::new(Mutex::new(CommandResult::new())));
    

#[derive(Debug, thiserror::Error)]
pub enum CliError {
    #[error("CLI is already running")]
    AlreadyRunning,
    #[error("Invalid GTA V installation: {0}")]
    InvalidInstallation(String),
    #[error("GTA V path not found at path: {0}")]
    PathNotFound(String),
    #[error("GTA5.exe not found in GTA V path: {0}")]
    ExecutableNotFound(String),
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
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
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
        let gta_path = validate_gta_path(gta_path)?;

        let exe_path = Path::new(&gta_path).join("GTA5.exe");
        if !exe_path.exists() {
            return Err(CliError::ExecutableNotFound(gta_path));
        }

        let shell = app_handle.shell();
        let (mut rx, command) = shell
            .command("CodeWalkerCli")
            .env("CLIMODE", "PIPED")
            .env("GTA_PATH", gta_path)
            .spawn()
            .map_err(|e| CliError::CommandError(e.to_string()))?;

        let process = Self::new(command);

        let app_handle = app_handle.clone();
        let cli_clone = Arc::clone(&CLI_PROCESS);
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        let line_str = String::from_utf8_lossy(&line);
                        if let Ok(mut guard) = cli_clone.lock() {
                            if let Some(cli) = guard.as_mut() {
                                if let Err(e) = handle_stdout(line_str.to_string(), &app_handle, cli) {
                                    println!("{} Error handling stdout: {}", CLI_ERROR, e);
                                }
                            }
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

#[tauri::command]
pub fn validate_gta_path(path: String) -> Result<String, CliError> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err(CliError::PathNotFound(path.display().to_string()));
    }

    if !path.is_dir() {
        return Err(CliError::InvalidInstallation(
            "Path is not a directory".to_string(),
        ));
    }

    let exe_path = path.join("GTA5.exe");
    if !exe_path.exists() {
        return Err(CliError::ExecutableNotFound(path.display().to_string()));
    }

    Ok(path.to_string_lossy().into_owned())
}

static CLI_PROCESS: Lazy<Arc<Mutex<Option<CliProcess>>>> = Lazy::new(|| Arc::new(Mutex::new(None)));
    fn handle_stdout(line_str: String, app_handle: &AppHandle, cli: &mut CliProcess) -> Result<(), CliError> {
        let mut cmd_result = CURRENT_COMMAND
            .lock()
            .map_err(|e| CliError::LockError(e.to_string()))?;
        
        cmd_result.output.push(line_str.clone());
        
        match line_str {
            _ if line_str.contains(OUTPUT_START_MSG) => {
                println!("{} Output Start", CLI_INFO);
                cmd_result.start_index = Some(cmd_result.output.len());
            }
            _ if line_str.contains(OUTPUT_END_MSG) => {
                println!("{} Output End", CLI_INFO);
                cmd_result.end_index = Some(cmd_result.output.len());
            }
            _ if line_str.contains(COMMAND_COMPLETE_MSG) => {
                cli.set_processing(false);
                cmd_result.complete = true;
            }
            _ if !cli.is_ready() && line_str.contains(CACHE_INITIALIZED_MSG) => {
                println!("{} CLI Ready", CLI_INFO);
                cli.set_ready();
            }
            _ if line_str.contains(PROCESSING_COMMAND_MSG) => {
                cli.set_processing(true);
            }
            _ => {}
        }
    
        if !cli.processing_command {
            print!("{} {}", CLI_INFO, line_str);
            if let Err(e) = app_handle.emit("cli-output", line_str) {
                println!("{} Error emitting event: {}", CLI_ERROR, e);
            }
        }
    
        Ok(())
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
pub async fn send_command(command: String) -> Result<String, CliError> {
    println!("{} Executing: {}", CLI_INFO, command);

    {
        let mut cmd_result = CURRENT_COMMAND.lock().map_err(|e| CliError::LockError(format!("{} {}", CLI_ERROR, e)))?;
        *cmd_result = CommandResult::new();
    }

    {
        let cli_process = Arc::clone(&CLI_PROCESS);
        let mut guard = cli_process
            .lock()
            .map_err(|e| CliError::LockError(format!("{} {}", CLI_ERROR, e)))?;

        let cli = guard.as_mut().ok_or(CliError::NotRunning)?;
        cli.send_command(command)?;
    }

    loop {
        let output_to_process = {
            let cmd_result = CURRENT_COMMAND.lock().unwrap();
            if cmd_result.complete {
                let output = match (cmd_result.start_index, cmd_result.end_index) {
                    (Some(start), Some(end)) if start < end => {
                        cmd_result.output[start+1..end-1].to_vec()
                    },
                    _ => cmd_result.output.clone()
                };
                
                println!("{} Output finished {}:{}", CLI_INFO, 
                    cmd_result.start_index.unwrap_or(0), 
                    cmd_result.end_index.unwrap_or(0));
                
                Some(output)
            } else {
                None
            }
        };

        if let Some(output) = output_to_process {
            let filtered_output = output.iter()
                .map(|line| line.trim())
                .filter(|line| {
                    !line.is_empty() && 
                    !line.starts_with('[') && 
                    !line.starts_with("Checking")
                })
                .collect::<Vec<_>>()
                .join("\n");

            println!("{} Command complete", CLI_INFO);
            return Ok(filtered_output);
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
    }
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
