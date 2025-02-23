<script lang="ts">
    import type { VectorInfo } from "$types/types";

    type Props = {
        name: string,
        vectors: VectorInfo[],
    }
    
    let {
        name = "",
        vectors = $bindable([]),
    }: Props = $props();  
    
</script>

<li class="file">
    <details>
        <summary>📄 {name}</summary>
        <ul class="vector-list">
            {#each vectors as vec}
                <li class="vector-item">
                    <div class="file-info">
                        <span class="file-name">{vec.file}</span>
                        <span class="line-num">Line: {vec.line_number}</span>
                    </div>
                    <span class="vector-data">vector{vec.vector.length}({vec.vector.join(", ")})</span>
                </li>
            {/each}
        </ul>
    </details>
</li>

<style>
    .file summary {
        font-weight: bold;
        padding: 6px;
        cursor: pointer;
        background: #45475a;
        color: #89b4fa;
        border-radius: 4px;
        margin-bottom: 5px;
        display: flex;
        align-items: center;
    }

    .vector-list {
        padding: 0;
        margin: 0;
        list-style: none;
    }

    .vector-item {
        display: flex;
        flex-direction: column;
        background: #1c3353;
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 5px;
        gap: 4px;
    }

    .file-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9em;
        color: #bac2de;
    }

    .file-name {
        font-weight: bold;
        color: #89b4fa;
    }

    .line-num {
        color: #94e2d5;
        font-weight: bold;
        margin-left: 15px;
    }

    .vector-data {
        font-size: 0.9em;
        color: #bac2de;
        background: #585b70;
        padding: 4px 8px;
        border-radius: 4px;
        text-align: center;
        display: block;
    }
</style>
