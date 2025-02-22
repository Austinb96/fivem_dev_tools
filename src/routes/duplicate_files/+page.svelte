<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { settings } from "../../settings.svelte";

    type DuplicateFileEntry = [string, string[]]; // Tuple: [file name, array of paths]
    
    let files: DuplicateFileEntry[] = $state([]);
    let expandedFile: string | null = $state(null);
    let loading = $state();
    
    let filters: Record<string, boolean> = $state({
        ymap: true,
        ybn: true,
        ydr: true,
        ytd: true,
        ytyp: true,
        ymt: true
    })

    async function find_duplicate_files() {
        loading = true;
        const active_filters: string[] = Object.entries(filters)
            .filter(([_, value]) => value)
            .map(([key, _]) => key);
            
        console.log(active_filters);
        let response = await invoke("find_duplicate_files", {
            path: settings.base_path,
            filter: active_filters
        });

        files = response as DuplicateFileEntry[];
        expandedFile = null; // Reset expanded state
        loading = false;
    }

    function toggleExpand(file: string) {
        expandedFile = expandedFile === file ? null : file;
    }
</script>

<h1>Duplicate Files</h1>
<button onclick={find_duplicate_files}>Find Duplicate Files</button>
<div class="filter-container">
    {#each Object.entries(filters) as [filter, active]}
        <button class:active={active} class="filter-btn" onclick={() => filters[filter] = !active}>{filter}</button>
    {/each}
</div>
{#if files.length > 0}
    <div class="file-list">
        {#each files as [file, paths]}
            <div class="file-card">
                <button class="file-header" onclick={() => toggleExpand(file)} aria-expanded={expandedFile === file} type="button">
                    <h2>{file}</h2>
                    <span class="arrow">{expandedFile === file ? "▲" : "▼"}</span>
                </button>
                {#if expandedFile === file}
                    <ul class="path-list">
                        {#each paths as path}
                            <li>{path}</li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/each}
    </div>
{:else if loading}
    <p>Loading...</p>
{:else if loading == false}
    <p>No duplicate files found.</p>
{/if}

<style>
    :root {
        --bg-color: #1e1e2e;
        --primary-color: #f7768e;
        --hover-color: #ff9e64;
        --text-color: #cdd6f4;
        --border-color: #313244;
    }

    h1 {
        margin-bottom: 1rem;
        text-align: center;
        color: var(--text-color);
    }

    button {
        display: block;
        margin: 0 auto 1rem auto;
        padding: 10px 15px;
        font-size: 14px;
        cursor: pointer;
        border: none;
        background-color: var(--primary-color);
        color: white;
        border-radius: 5px;
        transition: background 0.2s ease;
    }

    button:hover {
        background-color: var(--hover-color);
    }

    .file-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
    }

    .file-card {
        background: var(--bg-color);
        border: 2px solid var(--border-color);
        border-radius: 8px;
        padding: 10px;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, background 0.2s ease;
    }

    .file-card:hover {
        transform: scale(1.02);
        background: #313244;
    }

    .file-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 5px;
        background: var(--primary-color);
        color: white;
        border-radius: 5px;
        font-size: 14px;
    }

    .file-header h2 {
        font-size: 14px;
        margin: 0;
        flex-grow: 1;
    }

    .arrow {
        font-size: 14px;
    }

    .path-list {
        list-style-type: none;
        padding: 10px;
        margin: 5px 0 0;
        background: #45475a;
        border-radius: 5px;
        max-height: 150px;
        overflow-y: auto;
        font-size: 12px;
        color: var(--text-color);
    }

    .path-list li {
        padding: 5px;
        border-bottom: 1px solid var(--border-color);
        word-wrap: break-word;
    }

    .path-list li:last-child {
        border-bottom: none;
    }
    
    .filter-container {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
        justify-content: center;
    }

    .filter-btn {
        padding: 6px 12px;
        font-size: 14px;
        border: 2px solid #f7768e;
        border-radius: 5px;
        cursor: pointer;
        background: transparent;
        color: #f7768e;
        transition: all 0.2s ease-in-out;
    }

    .filter-btn.active {
        background: #f7768e;
        color: white;
    }   
</style>
