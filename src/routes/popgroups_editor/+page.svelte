<script lang="ts">
import { ItemType, type PopGroup } from "$types/types";
import { open } from '@tauri-apps/plugin-dialog';
import { codewalkercli } from "../../codewalkercli.svelte";
import { settings } from "../../settings.svelte";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "../../toast.svelte";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";

let loading = $state(false);
let loaded_file = $state("");

let currentSection: "pedGroups" | "vehGroups" = $state("pedGroups");
let pedGroups: PopGroup[] = $state([]);
let vehGroups: PopGroup[] = $state([]);
let newModelInput = $state("");

let groups = $derived(currentSection === "pedGroups" ? pedGroups : vehGroups);
let selectedPopGroupName = $state(groups.length ? groups[0].Name : "");
let selectedPopGroup = $derived(
	groups.find((g) => g.Name === selectedPopGroupName) || null,
);
let selectedModels = $derived(
	selectedPopGroup ? selectedPopGroup.models.Items : [],
);

async function handleFileInput() {
	try {
            const selected = await open({
                multiple: false,
                directory: false,
                extensions: ["ymt", "xml"],
            });
            
            console.log(selected);
            
            if (!selected){
                return;
            }
            loaded_file = selected;
            loading = true;
            const file_ext = selected[0].split('.').pop();
            let xml = ""
            if (file_ext ==="xml"){
                xml = await readTextFile(selected);
                
            } else{
                const save_path = `${settings.save_path}/popgroups.xml`;
                const result = await codewalkercli.export_xml(selected, save_path, "pso");
                if (result){
                    xml = await invoke("read_file", {
                        path: save_path,
                    });
                    
                    console.log(xml);
                }
            }
            
            if (xml){
                parseXML(xml);
            }
            
            loading = false;
        } catch (e) {
            loading = false;
            toast.add({
                text: `Error selecting file: ${e}`,
                type: "error",
            })
            console.error("Error selecting file:", e);
        }
}

async function openSavePath() {
    if (settings.save_path) {
        await openPath(settings.save_path);
    } else {
        toast.add({
            text: "Save path not set",
            type: "error"
        });
    }
}

function parseXML(xmlString: string) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlString, "text/xml");

	function extractGroups(selector: string): PopGroup[] {
		return Array.from(xmlDoc.querySelectorAll(`${selector} > Item`)).map(
			(item) => ({
				Name: item.querySelector("Name")?.textContent || "",
				models: {
					itemType: ItemType.PopModelAndVariations,
					Items: Array.from(item.querySelectorAll("models > Item > Name")).map(
						(m) => ({
							Name: m.textContent || "",
						}),
					),
				},
				flags: item.querySelector("flags")?.textContent || "",
			}),
		);
	}

	pedGroups = extractGroups("pedGroups");
	vehGroups = extractGroups("vehGroups");
    
    pedGroups.sort((a, b) => a.Name.localeCompare(b.Name));
    vehGroups.sort((a, b) => a.Name.localeCompare(b.Name));
}

function saveToXML() {
	let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CPopGroupList>\n`;

	function buildGroupXML(groups: PopGroup[], tag: string) {
		let xml = ` <${tag} itemType="CPopulationGroup">\n`;
		for (const group of groups) {
			xml += `  <Item>\n   <Name>${group.Name}</Name>\n   <models itemType="CPopModelAndVariations">\n`;
			for (const model of group.models.Items) {
				xml += `    <Item>\n     <Name>${model.Name}</Name>\n    </Item>\n`;
			}
			xml += `   </models>\n   <flags>${group.flags}</flags>\n  </Item>\n`;
		}
		xml += ` </${tag}>\n`;
		return xml;
	}

	xml += buildGroupXML(pedGroups, "pedGroups");
	xml += buildGroupXML(vehGroups, "vehGroups");
	xml += "</CPopGroupList>";

	return xml;
}

async function downloadXML() {
    try{
        const xml = saveToXML();
        const success = await invoke("write_file", {
            path: `${settings.save_path}/popgroups.xml`,
            content: xml,
        });
        if (!success){
            throw new Error("Failed to save xml file");
        }
        
        const ymt_path = `${settings.save_path}/popgroups.ymt`;
        const result = codewalkercli.import_xml(`${settings.save_path}/popgroups.xml`, ymt_path, "pso");
        
        if (result){
            toast.add({
                text: "File saved successfully",
                type: "success",
            })
        } else{
            throw new Error("Failed to save ymt file");
        }
        
    } catch (e) {
        toast.add({
            text: `Error saving file: ${e}`,
            type: "error",
        })
        console.error("Error saving file:", e);
    }
}

function addModel() {
	if (!selectedPopGroup || !newModelInput.trim()) return;
	selectedPopGroup.models.Items = [
		...selectedPopGroup.models.Items,
		{ Name: newModelInput.trim() },
	];
	newModelInput = "";
}

function removeModel(modelToRemove: string) {
	if (!selectedPopGroup) return;
	selectedPopGroup.models.Items = selectedPopGroup.models.Items.filter(
		(model) => model.Name !== modelToRemove,
	);
}
</script>
<div class="container">
    <div class="header">
        <div class="controls">
            <button class={currentSection === "pedGroups" ? "active" : ""} onclick={() => currentSection = "pedGroups"}>Peds</button>
            <button class={currentSection === "vehGroups" ? "active" : ""} onclick={() => currentSection = "vehGroups"}>Vehicles</button>
        </div>
        <div class="actions">
            <div class="file-controls">
                <input 
                    type="text" 
                    class="file-path"
                    value={loaded_file}
                    placeholder="No file selected"
                    readonly
                />
                <button 
                    class="action-btn"
                    onclick={() => handleFileInput()}
                >
                    Browse
                </button>
                <button 
                    class="action-btn folder-btn" 
                    onclick={openSavePath}
                    title="Open output folder"
                >
                    📁
                </button>
            </div>
            <button class="save-btn" onclick={downloadXML}>
                <span>💾</span> Save
            </button>
        </div>
    </div>
    
    <div class="group-selector">
        <label>Select a {currentSection === "pedGroups" ? "Ped" : "Vehicle"} Group</label>
        <select bind:value={selectedPopGroupName}>
            <option value="" selected>-- Select Group --</option>
            {#each groups as group}
                <option value={group.Name}>{group.Name}</option>
            {/each}
        </select>
    </div>

    {#if selectedPopGroup}
        <div class="models-editor">
            <h3>Models</h3>
            <div class="add-model">
                <input type="text" bind:value={newModelInput} placeholder="Enter model name" />
                <button onclick={addModel}>Add</button>
            </div>

            <ul class="models-list">
                {#each selectedModels as model}
                    <li class="model-item">
                        <span>{model.Name}</span>
                        <button onclick={() => removeModel(model.Name)}>Remove</button>
                    </li>
                {/each}
            </ul>
        </div>
    {:else if loading}
        <p>Loading...</p>
    {/if}
</div>

<style>
    .container {
        max-width: 700px;
        margin: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-family: Arial, sans-serif;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .controls {
        display: flex;
        gap: 0.5rem;
    }

    .controls button {
        padding: 0.5rem 1rem;
        border: none;
        background: #007bff;
        color: white;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
    }

    .controls button.active, .controls button:hover {
        background: #0056b3;
    }

    .actions {
        display: flex;
        gap: 1rem;
    }

    .actions .save-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
        font-size: 0.9rem;
    }


    .actions .save-btn {
        background: #28a745;
    }

    .actions .save-btn:hover {
        background: #218838;
    }

    .group-selector label {
        font-weight: bold;
        display: block;
        margin-bottom: 0.5rem;
    }

    .group-selector select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .models-editor {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .add-model {
        display: flex;
        gap: 0.5rem;
    }

    .add-model input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .models-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .model-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: #f5f5f5;
        border-radius: 4px;
        margin-bottom: 0.5rem;
        color: black;
    }

    .model-item button {
        background: #dc3545;
        color: white;
        border: none;
        padding: 0.3rem 0.5rem;
        border-radius: 4px;
        cursor: pointer;
    }

    .model-item button:hover {
        background: #b02a37;
    }

    .file-controls {
        display: flex;
        gap: 0.5rem;
        flex: 1;
        max-width: 600px;
    }

    .file-path {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #f5f5f5;
        color: #333;
        font-size: 0.9rem;
    }

    .action-btn {
        padding: 0.5rem 1rem;
        border: none;
        background: #6c757d;
        color: white;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
        font-size: 0.9rem;
    }

    .action-btn:hover {
        background: #5a6268;
    }

    .folder-btn {
        min-width: 42px;
        padding: 0.5rem;
    }
</style>
