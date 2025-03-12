import { invoke } from "@tauri-apps/api/core";
import { settings } from "./settings.svelte";
import { toast } from "./toast.svelte";

class CodeWalkerCli {
    output: string[] = $state([]);
    command_history: string[] = $state([]);
    constructor() {
        this.output = [];
    }

	start() {
        console.log("Starting CodeWalkerCLI", settings.game_path);
		invoke("start_codewalker", {
			gtaPath: settings.game_path,
		})
			.then(() => {
                this.output.push("CodeWalkerCLI started\n");
			})
			.catch((e) => {
                toast.add({
                    text: `Failed to start CodeWalkerCLI: ${e as string}`,
                    type: "error",
                })
				console.error(e);
			});
	}
    
    stop() {
        invoke("stop_codewalker")
            .then(() => {
                this.output = ["CodeWalkerCLI stopped\n"];
            })
            .catch((e) => {
                toast.add({
                    text: `Failed to stop CodeWalkerCLI: ${e as string}`,
                    type: "error",
                })
                console.error(e);
            });
    }
    
    //TODO better error handling
    async send_command(command: string) {
        this.command_history.push(command);
        invoke("send_command", {
            command: command
        })
            .then(() => {
                console.log("Command sent: ", command);
            })
            .catch((e) => {
                toast.add({
                    text: `Failed to send command: ${e as string}`,
                    type: "error",
                })
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
            
            return true;
            
        } catch (e) {
            return false;
        }
    }
}

export const codewalkercli = new CodeWalkerCli();
