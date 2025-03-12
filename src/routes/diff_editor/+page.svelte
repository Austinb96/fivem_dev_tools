<script lang="ts">
    import { onMount } from "svelte";
    import { diffTool } from "../../diffEditor.svelte";
    import { open } from '@tauri-apps/plugin-dialog';
    
    let active_tab = $state("diff");
    let file1Color = $state("#23C147");
    let file2Color = $state("#EC4B36");
    let showScrollButton = $state(false);
    
    async function handleFileInput(index: number) {
        try {
            const selected = await open({
                multiple: false,
                directory: false,
            });
    
            if (selected) {
                await diffTool.load_from_path(selected, index);
            }
            console.log(diffTool.xml[0].file_path, diffTool.xml[1].file_path)
            if (diffTool.xml[0].file_path && diffTool.xml[1].file_path) {
                diffTool.compare(0,1)
            }
        } catch (e) {
            console.error("Error selecting file:", e);
        }
    }
    
    async function handleFileOutput() {
        try {
            const selected = await open({
                multiple: false,
                directory: true,
            });
    
            if (selected) {
                diffTool.output_path = selected;
            }
        } catch (e) {
            console.error("Error selecting file:", e);
        }
    }
    
    function handleScroll() {
        showScrollButton = window.scrollY > 200; // Show after 200px scroll
    }

    onMount(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    });
    
    
    $effect(() => {
        document.documentElement.style.setProperty('--file1-color', file1Color);
        document.documentElement.style.setProperty('--file2-color', file2Color);
    });
</script>
        
<div class="container">
    <div class="editors">
        <div class="input-group">
            <div class="file-input">
                File 1:
                <input 
                    type="text" 
                    bind:value={diffTool.xml[0].file_path}
                    class="file-path"
                />
                <button 
                    class="browse-btn"
                    onclick={() => handleFileInput(0)}
                >
                    Browse
                </button>
                <input 
                    type="color" 
                    bind:value={file1Color} 
                    title="Change text color"
                    class="color-picker"
                />
            </div>
        </div>
        <div class="input-group">
            <div class="file-input">
                File 2:
                <input 
                    type="text" 
                    bind:value={diffTool.xml[1].file_path}
                    class="file-path"
                />
                <button 
                    class="browse-btn"
                    onclick={() => handleFileInput(1)}
                >
                    Browse
                </button>
                <input 
                    type="color" 
                    bind:value={file2Color} 
                    title="Change highlight color"
                    class="color-picker"
                />
            </div>
        </div>
    </div>
    
    {#if showScrollButton}
        <button 
            class="scroll-top" 
            onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
        >
            ▲
        </button>
    {/if}
    
    <div class="tabs">
        <button 
            class:active={active_tab === 'diff'} 
            onclick={() => active_tab = 'diff'}
        >
            Differences
        </button>
        <button 
            class:active={active_tab === 'result'} 
            onclick={() => {
                active_tab = 'result';
                diffTool.generate_result();
            }}
        > 
            Output
        </button>
    </div>
    
    {#if active_tab === 'diff' && diffTool.grouped_diff.length > 0}
        <div class="diff-viewer">
            <div class="diff-controls">
                <button 
                    class="toggle-button added"
                    onclick={() => diffTool.toggle_all_added(true)}
                >
                    Select All File1
                </button>
                <button 
                    class="toggle-button added"
                    onclick={() => diffTool.toggle_all_added(false)}
                >
                    Deselect All File1
                </button>
                <button 
                    class="toggle-button removed"
                    onclick={() => diffTool.toggle_all_removed(true)}
                >
                    Select All File2
                </button>
                <button 
                    class="toggle-button removed"
                    onclick={() => diffTool.toggle_all_removed(false)}
                >
                    Deselect All File2
                </button>
            </div>
            {#each diffTool.grouped_diff as group, groupIndex}
                <div class="diff-group">
                    <div 
                        role="button"
                        tabindex="0"
                        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && diffTool.toggle_group(groupIndex)}
                        class="diff-header"
                        onclick={() => diffTool.toggle_group(groupIndex)}
                    >
                        <span class="expand-icon">{group.isExpanded ? '▼' : '▶'}</span>
                        <span>Changes around {group.startLine + 1}</span>
                    </div>

                    {#if group.isExpanded}
                        <div class="chunk-controls">
                            <button 
                                class="toggle-button added"
                                onclick={() => diffTool.toggle_chunk_added(groupIndex, true)}
                            >
                                Select File1
                            </button>
                            <button 
                                class="toggle-button added"
                                onclick={() => diffTool.toggle_chunk_added(groupIndex, false)}
                            >
                                Deselect File1
                            </button>
                            <button 
                                class="toggle-button removed"
                                onclick={() => diffTool.toggle_chunk_removed(groupIndex, true)}
                            >
                                Select File2
                            </button>
                            <button 
                                class="toggle-button removed"
                                onclick={() => diffTool.toggle_chunk_removed(groupIndex, false)}
                            >
                                Deselect File2
                            </button>
                        </div>
                        {#each group.lines as line}
                            <div 
                                onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && diffTool.toggle_selected_line(line)}
                                role="button"
                                tabindex="0"
                                class="diff-line {line.type}"
                                class:selected={line.selected && (line.type === 'added' || line.type === 'removed')}
                                class:clickable={line.type === 'added' || line.type === 'removed'}
                                onclick={() => line.type !== 'context' && diffTool.toggle_selected_line(line)}
                            >
                                {#if line.type === 'added' || line.type === 'removed'}
                                    <input 
                                        type="checkbox" 
                                        checked={line.selected} 
                                        onchange={() => diffTool.toggle_selected_line(line)}
                                    />
                                {:else}
                                    <span class="checkbox-placeholder"></span>
                                {/if}
                                <span class="line-prefix">
                                    {#if line.type === 'added'}+
                                    {:else if line.type === 'removed'}-
                                    {:else}&nbsp;{/if}
                                    {line.lineNumber || ' '}
                                </span>
                                <pre>{line.content}</pre>
                            </div>
                        {/each}
                    {:else}
                        <div class="collapsed-summary">
                            <span>{group.lines.length} changed lines</span>
                            <span>{group.lines.filter(l => l.type === 'added').length} additions</span>
                            <span>{group.lines.filter(l => l.type === 'removed').length} deletions</span>
                        </div>
                    {/if}
                </div>
            {/each}

        </div>
    {:else if active_tab === 'result' && diffTool.result}
        <div class="diff-viewer">
            <div class="code-editor">
                <div class="save-container">
                    <div class="save-options">
                        <select bind:value={diffTool.save_options.mode}>
                            <option value="new_location">Save to New Location</option>
                            <option value="replace_file1">Replace File 1</option>
                            <option value="replace_file2">Replace File 2</option>
                            <option value="replace_both">Replace Both Files</option>
                        </select>
                        
                        {#if diffTool.save_options.mode === 'new_location'}
                            <input 
                                type="text" 
                                placeholder="Output path" 
                                bind:value={diffTool.output_path}
                                class="file-path"
                            />
                            <button 
                                class="browse-btn"
                                onclick={handleFileOutput}
                            >
                                Browse
                            </button>
                        {/if}
                        
                        {#if diffTool.save_options.mode === 'replace_file2'}
                            <label>
                                <input 
                                    type="checkbox" 
                                    bind:checked={diffTool.save_options.delete_file1}
                                />
                                Delete File 1 after save
                            </label>
                        {/if}
                        {#if diffTool.save_options.mode === 'replace_file1'}
                            <label>
                                <input 
                                    type="checkbox" 
                                    bind:checked={diffTool.save_options.delete_file2}
                                />
                                Delete File 2 after save
                            </label>
                        {/if}
                    </div>

                    <div class="save-actions">
                        <button 
                            class="save-btn download"
                            onclick={() => diffTool.download_result()}
                        >
                            Download
                        </button>
                        <button 
                            class="save-btn"
                            onclick={() => diffTool.save_result()}
                            disabled={!diffTool.output_path && diffTool.save_options.mode === 'new_location'}
                        >
                            Save
                        </button>
                    </div>
                </div>
                <div class="code-content">
                    <div class="line-numbers">
                        {#each diffTool.result.split('\n') as _, i}
                            <div class="line-number">{i + 1}</div>
                        {/each}
                    </div>
                    <div class="editor-content">
                        <textarea 
                            spellcheck="false"
                            bind:value={diffTool.result}
                            rows={diffTool.result.split('\n').length}
                        ></textarea>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
        
<style>
    .editors {
        position: sticky;
        top: 0;
        display: flex;
        flex-direction: column;
        margin-bottom: 1rem;
        z-index: 100;
    }

    .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .file-input {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #1e1e2e;
        padding: 0.5rem;
        border: 1px solid #45475a;
        border-radius: 4px;
        width: 100%;
    }

    .file-path {
        flex: 1;
        min-width: 0; /* Allows text to truncate */
        padding: 0.25rem 0.5rem;
        color: #cdd6f4;
        font-family: monospace;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        background: #313244; /* Darker background for the path */
        border-radius: 4px;
        border: 1px solid #45475a;
    }

    .browse-btn {
        background: #89b4fa;
        color: #1e1e2e;
        padding: 0.25rem 0.75rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        margin: 0;
        white-space: nowrap; /* Prevent button text from wrapping */
        flex-shrink: 0; /* Prevent button from shrinking */
    }

    .browse-btn:hover {
        background: #b4befe;
    }   

    .color-picker {
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: transparent;
    }

    .color-picker::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    .color-picker::-webkit-color-swatch {
        border: 1px solid #45475a;
        border-radius: 4px;
    }

    .diff-viewer {
        margin-top: 0;
        background: #313244;
        border-radius: 0 0 4px 4px;
        border: 1px solid #45475a;
        border-top: none;
    }

    .diff-group {
        margin: 1rem 0;
        border-bottom: 1px solid #45475a;
        padding-bottom: 1rem;
    }

    .diff-header {
        background: #181825;
        padding: 0.5rem;
        font-family: monospace;
        color: #cdd6f4;
        font-size: 0.9em;
        cursor: pointer;
        user-select: none;
    }

    .expand-icon {
        display: inline-block;
        width: 20px;
        color: #89b4fa;
    }

    .diff-line {
        padding: 0.25rem 0.5rem;
        font-family: monospace;
        white-space: pre;
        display: flex;
        align-items: center;  /* Center items vertically */
        line-height: 1.5;
        font-size: 14px;
        color: #cdd6f4;
    }

    .diff-line input[type="checkbox"] {
        margin: 0 4px;
        cursor: pointer;
    }

    .diff-line.added {
        color: var(--file1-color);
    }

    .diff-line.removed {
        color: var(--file2-color);
    }

    .diff-line.context {
        color: #6c7086;
        cursor: default;  /* Remove pointer cursor for context lines */
    }

    .diff-line.selected.added {
        background-color: color-mix(in srgb, var(--file1-color) 20%, transparent);
        box-shadow: inset 0 0 0 1px var(--file1-color);
    }

    .diff-line.selected.removed {
        background-color: color-mix(in srgb, var(--file2-color) 20%, transparent);
        box-shadow: inset 0 0 0 1px var(--file2-color);
    }

    .collapsed-summary {
        padding: 0.5rem 1rem;
        color: #6c7086;
        font-size: 0.9em;
    }

    .collapsed-summary span {
        margin-right: 1rem;
    }

    pre {
        margin: 0;
        flex: 1;
        overflow-x: auto;
        color: inherit;
        white-space: pre;
        tab-size: 4;
    }

    button {
        background-color: #89b4fa;
        color: #1e1e2e;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin: 1rem;
    }

    button:hover {
        background-color: #b4befe;
    }
    
    .tabs {
        display: flex;
        gap: 0;
        margin-bottom: 0;
        border-bottom: 1px solid #45475a;
    }

    .tabs button {
        background-color: #1e1e2e;
        color: #6c7086;
        border: 1px solid #45475a;
        border-bottom: none;
        padding: 0.5rem 1.5rem;
        border-radius: 4px 4px 0 0;
        cursor: pointer;
        margin: 0;
        position: relative;
        bottom: -1px;
    }

    .tabs button:not(:first-child) {
        margin-left: -1px;
    }

    .tabs button.active {
        background-color: #313244;
        color: #cdd6f4;
        border-bottom: 1px solid #313244;
        z-index: 1;
    }

    .tabs button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .tabs button:not(.active):hover:not(:disabled) {
        background-color: #252538;
        color: #89b4fa;
    }

    .diff-header-info {
        padding: 0.5rem;
        background: #313244;
        color: #cdd6f4;
        font-size: 0.9em;
        border-bottom: 1px solid #45475a;
    }

    .code-editor {
        display: flex;
        flex-direction: column;
        background: #1e1e2e;
        border: 1px solid #45475a;
        border-radius: 4px;
        overflow: hidden;
        margin: 0;
        border: none;
        border-radius: 0;
    }
    
    .code-content {
        display: flex;
        flex: 1;
        overflow-y: auto;
    }

    .line-numbers {
        padding: 1rem 0.5rem;
        user-select: none;
        text-align: right;
        flex-shrink: 0; /* Prevent line numbers from shrinking */
    }

    .line-number {
        color: #6c7086;
        font-family: monospace;
        font-size: 14px;
        line-height: 1.5;
        padding: 0 0.5rem;
    }

    .editor-content {
        flex: 1;
        position: relative;
    }

    .editor-content textarea {
        width: 100%;
        padding: 1rem;
        background: transparent;
        border: none;
        color: #cdd6f4;
        border-left: 1px solid #45475a;
        font-family: monospace;
        font-size: 14px;
        line-height: 1.5;
        resize: none;
        white-space: pre;
        tab-size: 4;
        -moz-tab-size: 4;
        outline: none;
        overflow: hidden;
    }

    /* Remove the old xml-preview style */
    .xml-preview {
        display: none;
    }

    
    .diff-line:nth-child(odd) {
        background-color: #1e1e2e;
    }
    
    .diff-line:nth-child(even){
        background-color: #181825;
    }

    .diff-line.clickable:hover {
        opacity: 0.9;
        box-shadow: inset 0 0 0 1px #6f739a;
    }

    .checkbox-placeholder {
        width: 13px;
        margin: 0 4px;
        display: inline-block;
    }

    .diff-controls {
        padding: 0.5rem;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        border-bottom: 1px solid #45475a;
    }

    .toggle-button {
        padding: 0.25rem 0.5rem;
        font-size: 0.8em;
        margin: 0;
    }

    .toggle-button.added {
        background-color: transparent;
        color: var(--file1-color);
        border: 1px solid var(--file1-color);
    }

    .toggle-button.removed {
        background-color: transparent;
        color: var(--file2-color);
        border: 1px solid var(--file2-color);
    }

    .toggle-button:hover {
        opacity: 0.9;
        background-color: #313244;
    }

    .chunk-controls {
        padding: 0.25rem 0.5rem;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        border-bottom: 1px solid #45475a;
        background-color: #181825;
    }

    .chunk-controls .toggle-button {
        padding: 0.15rem 0.35rem;
        font-size: 0.75em;
    }

    .scroll-top {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 36px;
        height: 36px;
        background: #1e1e2e;
        color: #89b4fa;
        border: 1px solid #45475a;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease;
        z-index: 100;
        opacity: 0.8;
        transition: all 0.2s ease, opacity 0.3s ease;
    }

    .scroll-top:hover {
        background: #313244;
        color: #b4befe;
        border-color: #89b4fa;
        opacity: 1;
    }
    
    .save-container {
        padding: 1rem;
        border-bottom: 1px solid #45475a;
        background: #181825;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        flex-direction: column;
        gap: 1rem;
    }

    .save-btn {
        background: #89b4fa;
        color: #1e1e2e;
        padding: 0.25rem 0.75rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        margin: 0;
        transition: all 0.2s ease;
    }

    .save-btn:hover:not(:disabled) {
        background: #b4befe;
    }

    .save-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .save-btn.download {
        background: #313244;
        color: #cdd6f4;
        border: 1px solid #45475a;
    }

    .save-btn.download:hover {
        background: #45475a;
        border-color: #89b4fa;
    }

    .save-options {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
    }

    .save-options select {
        background: #313244;
        color: #cdd6f4;
        border: 1px solid #45475a;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
    }

    .save-options label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #cdd6f4;
    }

    .save-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
    }
</style>
