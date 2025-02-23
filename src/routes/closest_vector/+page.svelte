<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { settings } from "../../settings.svelte";
    import FolderNode from "$lib/components/FolderNode.svelte";
    import type { FolderTree, VectorInfo } from "$types/types";
    import FileNode from "$lib/components/FileNode.svelte";

    let formated_vectors: FolderTree = $state({ subfolders: {}, files: {} });
    let filtered_vectors: FolderTree = $state({ subfolders: {}, files: {} });
    let vector: [number, number, number] = $state([0, 0, 0]);
    let dist: number = $state(1.0);
    let allOpen = $state(true);
    let vectorType: number = $state(3);
    let search_query: string = $state("");

    async function find_closest_vectors() {
        if (dist < 0) dist = 0;

        let vectorToSend: number[];
        if (vectorType === 2) {
            vectorToSend = [vector[0], vector[1]]; // Send only X, Y
        } else {
            vectorToSend = [...vector]; // Send X, Y, Z
        }

        const close_vectors: VectorInfo[] = await invoke("find_vectors_in_distance", {
            path: settings.base_path,
            v: vectorToSend,
            dist: dist,
        });

        formated_vectors = { subfolders: {}, files: {} };

        for (let i = 0; i < close_vectors.length; i++) {
            const path = close_vectors[i].file;
            const path_parts = path.split("\\");
            let current_folder = formated_vectors;
            for (let j = 0; j < path_parts.length - 1; j++) {
                if (!current_folder.subfolders[path_parts[j]]) {
                    current_folder.subfolders[path_parts[j]] = {
                        subfolders: {},
                        files: {},
                    };
                }
                current_folder = current_folder.subfolders[path_parts[j]];
            }
            if (!current_folder.files[path_parts[path_parts.length - 1]]) {
                current_folder.files[path_parts[path_parts.length - 1]] = [];
            }
            current_folder.files[path_parts[path_parts.length - 1]].push(
                close_vectors[i],
            );
        }

        filter_results();
    }

    function filter_results() {
        if (!search_query) {
            filtered_vectors = formated_vectors;
            return;
        }

        function recursiveFilter(node: FolderTree): FolderTree {
            let filteredNode: FolderTree = { subfolders: {}, files: {} };

            // Filter files
            for (const [fileName, vectors] of Object.entries(node.files)) {
                if (fileName.toLowerCase().includes(search_query.toLowerCase())) {
                    filteredNode.files[fileName] = vectors;
                }
            }

            // Filter subfolders recursively
            for (const [folderName, subfolder] of Object.entries(node.subfolders)) {
                const filteredSubfolder = recursiveFilter(subfolder);
                if (
                    folderName.toLowerCase().includes(search_query.toLowerCase()) ||
                    Object.keys(filteredSubfolder.subfolders).length > 0 ||
                    Object.keys(filteredSubfolder.files).length > 0
                ) {
                    filteredNode.subfolders[folderName] = filteredSubfolder;
                }
            }

            return filteredNode;
        }

        filtered_vectors = recursiveFilter(formated_vectors);
    }

</script>

<div class="controls">
    <div class="vector-settings">
        <div class="vector-toggle">
            <button class:active={vectorType === 2} onclick={() => vectorType = 2}>Vector2</button>
            <button class:active={vectorType === 3} onclick={() => vectorType = 3}>Vector3</button>
        </div>
    </div>

    <div class="vector-inputs">
        <div class="vector-fields">
            <input type="number" step="0.01" bind:value={vector[0]} placeholder="X" />
            <input type="number" step="0.01" bind:value={vector[1]} placeholder="Y" />
            {#if vectorType === 3}
                <input type="number" step="0.01" bind:value={vector[2]} placeholder="Z"/>
            {/if}
        </div>
        dist:<input type="number" step="0.01" bind:value={dist} placeholder="Distance" class="distance-input" />
    </div>

    <button class="search-btn" onclick={find_closest_vectors}>🔍</button>
</div>

<div class="folder-actions">
    {#if Object.keys(formated_vectors.subfolders).length > 0 || Object.keys(formated_vectors.files).length > 0}
        {#if allOpen}
            <button onclick={() => allOpen = false}>📁 Collapse All</button>
        {:else}
            <button onclick={() => allOpen = true}>📂 Expand All</button>
        {/if}
        <input class="search-box" type="text" placeholder="Search" bind:value={search_query} oninput={filter_results} />
    {/if}
</div>

<ul class="folder-tree">
    {#each Object.entries(filtered_vectors.subfolders) as [folderName, content]}
        <FolderNode name={folderName} content={content} bind:allOpen={allOpen} />
    {/each}

    {#each Object.entries(filtered_vectors.files) as [fileName, vectors]}
        <FileNode name={fileName} vectors={vectors} />
    {/each}
</ul>

<style>
    .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        align-items: center;
        padding: 15px;
        background: #313244;
        border-radius: 8px;
        margin-bottom: 15px;
    }

    .vector-settings {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .vector-toggle {
        display: flex;
        gap: 5px;
    }

    .vector-toggle button {
        padding: 6px 12px;
        border: none;
        cursor: pointer;
        border-radius: 4px;
        background: #585b70;
        color: white;
        transition: 0.2s;
    }

    .vector-toggle button.active {
        background: #89b4fa;
    }

    .vector-toggle button:hover {
        background: #74c7ec;
    }

    .vector-inputs {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
    }

    .vector-fields {
        display: flex;
        gap: 8px;
    }

    input {
        padding: 2px;
        border: none;
        border-radius: 4px;
        background: #45475a;
        color: #f8f8f2;
        width: 80px;
        text-align: center;
    }

    .distance-input {
        width: 100px;
    }

    .search-btn {
        padding: 10px 15px;
        background: #f7768e;
        color: white;
        border: none;
        cursor: pointer;
        border-radius: 4px;
    }

    .search-btn:hover {
        background: #ff9e64;
    }

    .folder-actions {
        margin-bottom: 10px;
    }

    .folder-actions button {
        margin-right: 10px;
        padding: 8px 12px;
        border: none;
        cursor: pointer;
        border-radius: 4px;
        background: #89b4fa;
        color: white;
    }

    .folder-actions button:hover {
        background: #74c7ec;
    }
    
    .search-box {
        padding: 5px;
        border: none;
        border-radius: 4px;
        background: #45475a;
        color: #f8f8f2;
        width: 200px;
    }

    .folder-tree {
        list-style: none;
        padding-left: 0;
    }

    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
</style>
