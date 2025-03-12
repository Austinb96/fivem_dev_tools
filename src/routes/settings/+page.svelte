<script lang="ts">
    import { open } from '@tauri-apps/plugin-dialog';
    import { settings } from "../../settings.svelte";
    import Cli from "$lib/components/Cli.svelte";
    import { invoke } from '@tauri-apps/api/core';
    import { toast } from '../../toast.svelte';

    async function selectBasePath() {
        const folder = await open({
            multiple: false,
            directory: true,
        });

        if (folder) {
            settings.base_path = folder;
            settings.save();
        }
    }
    
    async function selectGamePath() {
        const folder = await open({
            multiple: false,
            directory: true,
        });

        try{
            const is_valid = await invoke('validate_gta_path', { path: folder });
            if (folder && is_valid) {
                toast.add({
                    text: 'GTA V Path is valid',
                    type: 'success',
                });
                settings.game_path = folder;
                settings.save();
            }
            
        }catch(e){
            toast.add({
                text: `Invalid GTA V Path: ${e}`,
                type: 'error',
            });
            console.error(e);
        }
    }
    
    async function selectSavePath() {
        const folder = await open({
            multiple: false,
            directory: true,
        });

        if (folder) {
            settings.save_path = folder;
            settings.save();
        }
    }
    
</script>

<div class="page-container">
    <h1>⚙️ Settings</h1>

    <section class="settings-container">
        <h2>Paths</h2>
        <div class="setting">
            <label>
                Base Path
                <div class="file-picker">
                    <input type="text" value={settings.base_path} readonly />
                    <button onclick={selectBasePath}>📁 Select Folder</button>
                </div>
            </label>
            
            <label>
                Game Path
                <div class="file-picker">
                    <input type="text" value={settings.game_path} readonly />
                    <button onclick={selectGamePath}>📁 Select Folder</button>
                </div>
            </label>
            
            <label>
                Save Path
                <div class="file-picker">
                    <input type="text" value={settings.save_path} readonly />
                    <button onclick={selectSavePath}>📁 Select Folder</button>
                </div>
            </label>
        </div>
    </section>

    <section class="settings-container">
        <h2>CodeWalker CLI</h2>
        <Cli />
    </section>
</div>

<style>
    :root {
        --bg-color: #1e1e2e;
        --primary-color: #f7768e;
        --hover-color: #ff9e64;
        --text-color: #cdd6f4;
        --border-color: #313244;
    }

    .page-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 15px;
    }

    h1 {
        text-align: center;
        margin-bottom: 20px;
    }

    h2 {
        color: var(--primary-color);
        margin-bottom: 15px;
        font-size: 1.2em;
    }

    .settings-container {
        background: var(--bg-color);
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        margin-bottom: 20px;
    }

    .setting {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .setting label {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .file-picker {
        display: flex;
        gap: 10px;
    }

    input {
        flex: 1;
        padding: 8px;
        border: 2px solid var(--border-color);
        border-radius: 5px;
        background: #45475a;
        color: var(--text-color);
        font-size: 14px;
    }

    button {
        padding: 8px 12px;
        border: none;
        border-radius: 5px;
        background: var(--primary-color);
        color: white;
        cursor: pointer;
        transition: background 0.2s ease-in-out;
    }

    button:hover {
        background: var(--hover-color);
    }
</style>
