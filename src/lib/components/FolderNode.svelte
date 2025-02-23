<script lang="ts">
    import FileNode from "./FileNode.svelte";
    import FolderNode from './FolderNode.svelte';

    let { 
        name = "",
        content = $bindable({ subfolders: {}, files: {} }),
        allOpen = $bindable(false)
    } = $props();

    let isOpen = $state(allOpen);
    
    $effect(() => {
        isOpen = allOpen;
    });
</script>

<li class="folder">
    <details bind:open={isOpen}>
        <summary>📂 {name}</summary>
        <ul class="folder-content">
            {#each Object.entries(content.subfolders) as [subName, subContent]}
                <FolderNode name={subName} content={subContent} bind:allOpen={allOpen} />
            {/each}

            {#each Object.entries(content.files) as [fileName, vectors]}
                <FileNode name={fileName} vectors={vectors} />
            {/each}
        </ul>
    </details>
</li>

<style>
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
</style>
