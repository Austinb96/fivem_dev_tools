<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { settings } from "../../settings.svelte";

    type VectorInfo = {
        vector: [number, number, number],
        file: string,
        line_number: number;
    };
    
    type FolderTree = {
        [name: string]: FolderTree | VectorInfo[];
    };

    let close_vectors: VectorInfo[] = $state([]);
    let grouped_folders: FolderTree = $state({});
    let vector: [number, number, number] = $state([0, 0, 0]);
    let dist: number = $state(1.0);
    
    async function find_closest_vectors() {
        if (dist < 0) {
            dist = 0;
        }
        close_vectors = await invoke("find_vectors_in_distance", { 
            path: settings.base_path,
            v: vector,
            dist: dist
        });

        grouped_folders = buildFolderTree(close_vectors);

        console.log("Generated Folder Tree:", grouped_folders);
    }
    
    function buildFolderTree(vectors: VectorInfo[]): FolderTree {
        let tree: FolderTree = {};

        for (const v of vectors) {
            let parts = v.file.replace(/\\/g, "/").split("/"); // Normalize paths
            let current = tree;

            for (let i = 0; i < parts.length - 1; i++) {
                let folder = parts[i];

                if (!current[folder]) {
                    current[folder] = {};
                }

                current = current[folder] as FolderTree;
            }

            let file = parts[parts.length - 1];
            if (!current[file]) {
                current[file] = [];
            }

            (current[file] as VectorInfo[]).push(v);
        }

        // Sort everything
        function sortTree(tree: FolderTree) {
            for (const key in tree) {
                if (Array.isArray(tree[key])) {
                    (tree[key] as VectorInfo[]).sort((a, b) => a.line_number - b.line_number);
                } else {
                    sortTree(tree[key] as FolderTree);
                }
            }
        }

        sortTree(tree);
        return tree;
    }

    
    function isVectorArray(value: any): value is VectorInfo[] {
        return Array.isArray(value) && value.length > 0 && typeof value[0] === "object";
    }
    function renderTree(node) {
        if (Array.isArray(node)) {
            return node
                .map(
                    (v) => `
                    <li class="vector-item">
                        <span class="vector-data">${JSON.stringify(v.vector)} : ${v.line_number}</span>
                    </li>`
                )
                .join("");
        }
        return Object.entries(node)
            .map(
                ([key, value]) => `
                <details open class="folder">
                    <summary>📂 ${key}</summary>
                    <ul class="folder-content">
                        ${renderTree(value)}
                    </ul>
                </details>`
            )
            .join("");

    }
</script>


<div class="search-box">
    <form onsubmit={find_closest_vectors}>
        <div class="inputs">
            <input type="number" bind:value={vector[0]} placeholder="X" />
            <input type="number" bind:value={vector[1]} placeholder="Y" />
            <input type="number" bind:value={vector[2]} placeholder="Z" />
            <input type="number" bind:value={dist} placeholder="Distance" />
        </div>
        <button type="submit">🔍 Find Closest Vectors</button>
    </form>
</div>

<ul class="folder-tree">
    {#each Object.entries(grouped_folders) as [folder, content]}
        {#if isVectorArray(content)}
            <!-- Render file with vectors -->
            <ul class="file-list">
                {#each content as v}
                    <li class="vector-item">
                        <a href={`file://${v.file}:${v.line_number}`} class="line-link">
                            📄 {v.file} <span class="line-num">Line {v.line_number}</span>
                        </a>
                        <span class="vector-data">{JSON.stringify(v.vector)}</span>
                    </li>
                {/each}
            </ul>
        {:else}
            <!-- Render nested folders recursively -->
            {#each Object.entries(content) as [subfolder, subcontent]}
                <details open class="folder">
                    <summary>📂 {subfolder}</summary>
                    <ul class="folder-content">
                        {@html renderTree(subcontent)}
                    </ul>
                </details>
            {/each}
        {/if}
    {/each}
</ul>


<style>
    * {
        font-family: Arial, sans-serif;
        box-sizing: border-box;
    }

    .search-box {
        margin-bottom: 20px;
        padding: 10px;
        background: #313244;
        border-radius: 8px;
    }

    .inputs {
        display: flex;
        gap: 10px;
    }

    input {
        padding: 8px;
        border: none;
        border-radius: 4px;
        background: #45475a;
        color: #f8f8f2;
        width: 100px;
    }

    button {
        padding: 10px 15px;
        background: #f7768e;
        color: white;
        border: none;
        cursor: pointer;
        border-radius: 4px;
        margin-top: 10px;
    }

    button:hover {
        background: #ff9e64;
    }

    .folder-tree {
        list-style: none;
        padding-left: 0;
    }

    .folder summary {
        font-weight: bold;
        padding: 5px;
        cursor: pointer;
        background: #313244;
        color: #fab387;
        border-radius: 4px;
        margin-bottom: 5px;
    }

    .folder-content {
        list-style: none;
        padding-left: 20px;
    }

    .file-list {
        list-style: none;
        padding-left: 20px;
    }

    .vector-item {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #45475a;
        padding: 6px;
        border-radius: 4px;
        margin-bottom: 5px;
    }

    .line-link {
        font-weight: bold;
        color: #89b4fa;
        text-decoration: none;
    }

    .line-link:hover {
        text-decoration: underline;
    }

    .line-num {
        color: #94e2d5;
        font-weight: bold;
    }

    .vector-data {
        font-size: 0.9em;
        color: #bac2de;
        background: #585b70;
        padding: 3px 6px;
        border-radius: 4px;
    }
</style>
