import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { settings } from "./settings.svelte";

export enum CodeWalkerCliState {
    Started = 0,
    Stopped = 1,
}

class CodeWalkerCli {
    output: string[] = $state([]);
    command_history: string[] = $state([]);
    error: string = $state("");
    state: CodeWalkerCliState = $state(CodeWalkerCliState.Stopped);
    private unlisteners: UnlistenFn[] = [];

    constructor() {
        this.registerListeners();
        this.output = [];
        this.error = "";
        
        console.log("checking", this.output, this.error);
    }

    private async registerListeners() {
        this.unlisteners.push(
            await listen<string>("cli-output", (event) => {
                console.log("cli-output", event.payload);
                console.log("type:", typeof(event.payload))
                this.output.push(event.payload);
            }),
            await listen<string>("cli-error", (event) => {
                console.log("cli-error", event.payload);
                this.error = event.payload;
            })
        );
    }

    cleanup() {
        console.log("Cleaning up CodeWalkerCli");
        for (const unlisten of this.unlisteners) {
            unlisten();
        }
        this.unlisteners = [];
    }
    
	start() {
        console.log(this.error, this.output)
        this.error = "";
		invoke("start_codewalker", {
			gtaPath: settings.game_path,
		})
			.then(() => {
				this.state = CodeWalkerCliState.Started;
                this.output.push("CodeWalkerCLI started");
			})
			.catch((e) => {
                this.error = e as string;
				// console.error(e);
			});
            
        this.error = "banana";
	}
    
    stop() {
        this.error = "";
        invoke("stop_codewalker")
            .then(() => {
                this.state = CodeWalkerCliState.Stopped;
                this.output.push("CodeWalkerCLI stopped");
            })
            .catch((e) => {
                this.error = e as string;
                console.error(e);
            });
    }
    
    //TODO better error handling
    async send_command(command: string) {
        this.error = "";
        this.command_history.push(command);
        invoke("send_command", {
            command: command
        })
            .then(() => {
                console.log("Command sent: ", command);
            })
            .catch((e) => {
                this.error = e as string;
                console.error(e);
            });
    }
    
    //TODO better error handling
    async export_xml(file: string, output: string) {
        try{
            await this.send_command(`exportxml -i ${file} -o ${output}`);
            
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
            
            if(this.error) {
                throw this.error;
            }
            
            return true;
            
        } catch (e) {
            return false;
        }
    }
    
    async import_xml(file: string, output: string) {
        try{
            await this.send_command(`importxml -i ${file} -o ${output}`);
            
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
            
            if(this.error) {
                throw this.error;
            }
            
            return true;
            
        } catch (e) {
            return false;
        }
    }
}

export const codewalkercli = new CodeWalkerCli();

codewalkercli.start();

window.addEventListener('unload', () => {
    codewalkercli.cleanup();
});
