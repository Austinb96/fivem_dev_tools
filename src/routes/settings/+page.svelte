<script lang="ts">
    import { open } from '@tauri-apps/plugin-dialog';
    import { settings } from "../../settings.svelte";

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
</script>

<h1>⚙️ Settings</h1>

<div class="settings-container">
    <div class="setting">
        Base Path
        <div class="file-picker">
            <input type="text" value={settings.base_path} readonly />
            <button on:click={selectBasePath}>📁 Select Folder</button>
        </div>
    </div>
</div>

<style>
    :root {
        --bg-color: #1e1e2e;
        --primary-color: #f7768e;
        --hover-color: #ff9e64;
        --text-color: #cdd6f4;
        --border-color: #313244;
    }

    h1 {
        text-align: center;
        margin-bottom: 15px;
    }

    .settings-container {
        max-width: 500px;
        margin: 0 auto;
        background: var(--bg-color);
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }

    .setting {
        display: flex;
        flex-direction: column;
        margin-bottom: 15px;
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
        cursor: pointer;
        transition: background 0.2s ease-in-out;
    }

    .file-picker button {
        background: var(--primary-color);
        color: white;
    }

    .file-picker button:hover {
        background: var(--hover-color);
    }
</style>
