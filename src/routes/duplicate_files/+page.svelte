<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { settings } from "../../settings.svelte";

    type DuplicateFileEntry = [string, string[]];
    
    let files: DuplicateFileEntry[] = $state([]);
    let filtered_files: DuplicateFileEntry[] = $state([]);
    let expandedFile: string | null = $state(null);
    let loading = $state();
    let newFilter = $state("");
    let adding_filter = $state(false);
    let search_query = $state("");
    
    let filters: Record<string, boolean> = $state({
        ymap: true,
        ybn: true,
        ydr: true,
        ytd: true,
        ytyp: true,
        ymt: true,
        occl: true, 
        lodlights: true
    });

    async function find_duplicate_files() {
        loading = true;
        const active_filters: string[] = Object.entries(filters)
            .filter(([_, value]) => value)
            .map(([key, _]) => key);
            
        let response = await invoke("find_duplicate_files", {
            path: settings.base_path,
            filter: active_filters
        });

        files = response as DuplicateFileEntry[];
        expandedFile = null;
        loading = false;
        filter_results();
    }

    function toggleExpand(file: string) {
        expandedFile = expandedFile === file ? null : file;
    }

    function addCustomFilter() {
        if (newFilter.trim() !== "" && !(newFilter in filters)) {
            filters[newFilter] = true;
            newFilter = "";
        }
    }
    

    function filter_results() {
        if (!search_query) {
            filtered_files = files;
            return;
        }
        
        filtered_files = files.filter(([file, paths]) => {
            return file.toLowerCase().includes(search_query.toLowerCase()) || paths.some(path => path.toLowerCase().includes(search_query.toLowerCase()));
        });
    }
    
</script>

<h1>Duplicate Files</h1>
<div style="display: flex; justify-content: space-between;">
    <button onclick={find_duplicate_files}>Find Duplicate Files</button>
    <input class="search-box" type="text" placeholder="Search" bind:value={search_query} oninput={filter_results} />
</div>

<div class="filter-container-wrapper">
    <div class="filter-container">
        {#each Object.entries(filters) as [filter, active]}
            <button class:active={active} class="filter-btn" onclick={() => filters[filter] = !active}>{filter}</button>
        {/each}
        <button class:active={adding_filter} class="filter-btn" onclick={() => adding_filter = !adding_filter}>
            {adding_filter ? "-" : "+"}
        </button>
    </div>

    <div class="add-filter" class:visible={adding_filter}>
        <input type="text" bind:value={newFilter} placeholder="Add custom filter..." />
        <button onclick={addCustomFilter}>Add</button>
    </div>
</div>

{#if filtered_files.length > 0}
    <div class="file-list">
        {#each filtered_files as [file, paths]}
            {#if filters[file.split(".").pop()]}
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
            {/if}
        {/each}
    </div>
{:else if loading}
    <p class="loading">Loading...</p>
{:else if loading == false}
    <p class="no-files">No duplicate files found.</p>
{/if}

<style>
    :root {
        --bg-color: #1e1e2e;
        --primary-color: #f7768e;
        --hover-color: #ff9e64;
        --text-color: #cdd6f4;
        --border-color: #313244;
        --card-bg: #2a2b3d;
    }

    h1 {
        margin-bottom: 1rem;
        text-align: center;
        color: var(--text-color);
    }

    button {
        display: inline-block;
        padding: 10px 15px;
        font-size: 14px;
        cursor: pointer;
        border: none;
        background-color: var(--primary-color);
        color: white;
        border-radius: 6px;
        transition: background 0.2s ease, transform 0.1s ease;
    }

    .file-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 0;
        width: 100%;
        max-width: 650px;
        margin: 20px auto;
    }

    .file-card {
        background: var(--card-bg);
        border-radius: 10px;
        padding: 12px;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.15);
        transition: 0.2s ease;
    }

    .file-card:hover {
        background: #313244;
    }

    .file-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 8px;
        background: var(--primary-color);
        color: white;
        border-radius: 6px;
        font-size: 14px;
        transition: background 0.2s ease;
        width: 100%;
    }

    .file-header:hover {
        background: var(--hover-color);
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
        padding: 6px;
        border-bottom: 2px solid var(--border-color);
        background-color: var(--card-bg);
        word-wrap: break-word;
    }

    .path-list li:last-child {
        border-bottom: none;
    }

    .path-list li:nth-child(odd){
        background: #30325d;
    }
    
    .filter-container-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
    }

    .filter-container {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 15px;
        justify-content: center;
    }

    .filter-btn {
        padding: 6px 14px;
        font-size: 14px;
        border: 2px solid var(--primary-color);
        border-radius: 6px;
        cursor: pointer;
        background: transparent;
        color: var(--primary-color);
        transition: all 0.2s ease-in-out;
    }

    .filter-btn.active {
        background: var(--primary-color);
        color: white;
    }

    .add-filter {
        display: none;
        gap: 10px;
        justify-content: center;
    }

    .add-filter.visible {
        display: flex;
    }

    .add-filter input {
        padding: 6px 12px;
        font-size: 14px;
        border: 2px solid var(--primary-color);
        border-radius: 6px;
        color: var(--text-color);
        background: var(--bg-color);
    }

    .loading, .no-files {
        text-align: center;
        font-size: 14px;
        color: var(--text-color);
        margin-top: 20px;
    }
    
    .search-box {
        padding: 5px;
        border: none;
        border-radius: 4px;
        background: #45475a;
        color: #f8f8f2;
        width: 200px;
    }
</style>
