import { invoke } from "@tauri-apps/api/core";
import { settings } from "./settings.svelte";
import { toast } from "./toast.svelte";

const MAX_OUTPUT_LINES = 500;
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
    
    add_output(text: string) {
        this.output.push(text);
        if (this.output.length > MAX_OUTPUT_LINES) {
            this.output = this.output.slice(-MAX_OUTPUT_LINES);    
        }
    }
    
    async send_command(command: string) {
        console.log("Sending command:", command);
        this.command_history.push(command);
        try {
            const result = await invoke<string>("send_command", {
                command: command
            });
            return result;
        } catch (e) {
            toast.add({
                text: `Failed to send command: ${e as string}`,
                type: "error",
            })
            console.error(e);
            return "";
        }
    }
    
    async export_xml(file: string, output?: string, meta_type?: string) {
        try{
            const result = await this.send_command(`exportxml -i "${file}" ${output ? `-o ${output}` : ""} ${meta_type ? ` -m ${meta_type}` : ""}`);
            return result
        } catch (e) {
            toast.add({
                text: `Failed to export XML: ${e as string}`,
                type: "error",
            })
            console.error(e);
            return "";
        }
    }
    
    async import_xml(file: string, output: string, meta_type?: string) {
        try{
            await this.send_command(`importxml -i "${file}" -o "${output}" ${meta_type ? ` -m ${meta_type}` : ""}`);
            
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
            
            return true;
            
        } catch (e) {
            return false;
        }
    }
    
    async export_model_xml(model_names: string | string[], output?: string): Promise<{[key: string]: string}> {
        try {
            console.log('Exporting models:', model_names, Array.isArray(model_names));
            if (Array.isArray(model_names)) {
                const results: {[key: string]: string} = {};
                
                const models_str = model_names.join(',');
                const result = await this.send_command(`exportmodel -n "${models_str}" ${output ? `-o ${output}` : ""}`);
                
                console.log("models returned");
                
                // Split by model markers and parse each section
                const parts = result.split('---MODEL:');
                for (const part of parts) {
                    if (!part.trim()) continue;
                    
                    // Find the end of the model name (marked by ---)
                    const nameEnd = part.indexOf('---');
                    if (nameEnd === -1) continue;
                    
                    const modelName = part.substring(0, nameEnd).trim();
                    const xml = part.substring(nameEnd + 3).trim();
                    
                    if (modelName && xml) {
                        results[modelName] = xml;
                    }
                }
                
                return results;
            }
            
            const result = await this.send_command(`exportmodel -n "${model_names}" ${output ? `-o ${output}` : ""}`);
            // Handle single model case with same parsing
            const parts = result.split('---MODEL:');
            if (parts.length > 1) {
                const nameEnd = parts[1].indexOf('---');
                if (nameEnd !== -1) {
                    const xml = parts[1].substring(nameEnd + 3).trim();
                    return { [model_names]: xml };
                }
            }
            return { [model_names]: '' };
        } catch(e) {
            console.error('Failed to export models:', e);
            return {};
        }
    }
}

export const codewalkercli = new CodeWalkerCli();

//on refresh stop codewalker

window.addEventListener("beforeunload", (e) => {
    codewalkercli.stop();
});
