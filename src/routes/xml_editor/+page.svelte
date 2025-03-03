<script lang="ts">
    import { xmlTool } from "../../xml.svelte";
    
    let active_tab = $state("diff"); // Change default to diff
    
    function handleFileInput(event: Event, index: number) {
        const input = event.target as HTMLInputElement;
        if (input.files?.[0]) {
            xmlTool.load_xml_from_file(input.files[0], index);
        }
    }
    
    function handleCompare() {
        xmlTool.compare(0, 1);
    }
    
    function handleGenerate() {
        xmlTool.generate_result();
        active_tab = "result"; // Auto-switch to result tab
    }
    </script>
    
    <div class="container">
        <div class="editors">
            <div class="input-group">
                <label for="file1">Original XML:</label>
                <input
                    id="file1"
                    type="file"
                    accept=".xml"
                    onchange={(e) => handleFileInput(e, 0)}
                />
            </div>
            <div class="input-group">
                <label for="file2">Modified XML:</label>
                <input 
                    id="file2"
                    type="file"
                    accept=".xml"
                    onchange={(e) => handleFileInput(e, 1)}
                />
            </div>
        </div>
        
        <div class="actions">
            <button onclick={handleCompare}>
                Compare XML
            </button>
            <button onclick={handleGenerate}>
                Generate XML
            </button>
        </div>
        
        <div class="tabs">
            <button 
                class:active={active_tab === 'diff'} 
                onclick={() => active_tab = 'diff'}
                disabled={!xmlTool.grouped_diff.length}
            >
                Differences
            </button>
            <button 
                class:active={active_tab === 'result'} 
                onclick={() => active_tab = 'result'}
                disabled={!xmlTool.result}
            >
                Final XML
            </button>
        </div>
        
        {#if active_tab === 'diff' && xmlTool.grouped_diff.length > 0}
            <div class="diff-viewer">
                <h3>Differences</h3>
                <div class="diff-controls">
                    <button 
                        class="toggle-button added"
                        onclick={() => xmlTool.toggle_all_added(true)}
                    >
                        Select All Added
                    </button>
                    <button 
                        class="toggle-button added"
                        onclick={() => xmlTool.toggle_all_added(false)}
                    >
                        Deselect All Added
                    </button>
                    <button 
                        class="toggle-button removed"
                        onclick={() => xmlTool.toggle_all_removed(true)}
                    >
                        Select All Removed
                    </button>
                    <button 
                        class="toggle-button removed"
                        onclick={() => xmlTool.toggle_all_removed(false)}
                    >
                        Deselect All Removed
                    </button>
                </div>
                {#each xmlTool.grouped_diff as group, groupIndex}
                    <div class="diff-group">
                        <div 
                            role="button"
                            tabindex="0"
                            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && xmlTool.toggle_group(groupIndex)}
                            class="diff-header"
                            onclick={() => xmlTool.toggle_group(groupIndex)}
                        >
                            <span class="expand-icon">{group.isExpanded ? '▼' : '▶'}</span>
                            <span>Changes around {group.startLine + 1}</span>
                        </div>
    
                        {#if group.isExpanded}
                            <div class="chunk-controls">
                                <button 
                                    class="toggle-button added"
                                    onclick={() => xmlTool.toggle_chunk_added(groupIndex, true)}
                                >
                                    Select Added
                                </button>
                                <button 
                                    class="toggle-button added"
                                    onclick={() => xmlTool.toggle_chunk_added(groupIndex, false)}
                                >
                                    Deselect Added
                                </button>
                                <button 
                                    class="toggle-button removed"
                                    onclick={() => xmlTool.toggle_chunk_removed(groupIndex, true)}
                                >
                                    Select Removed
                                </button>
                                <button 
                                    class="toggle-button removed"
                                    onclick={() => xmlTool.toggle_chunk_removed(groupIndex, false)}
                                >
                                    Deselect Removed
                                </button>
                            </div>
                            {#each group.lines as line}
                                <div 
                                    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && xmlTool.toggle_selected_line(line)}
                                    role="button"
                                    tabindex="0"
                                    class="diff-line {line.type}"
                                    class:selected={line.selected && (line.type === 'added' || line.type === 'removed')}
                                    class:clickable={line.type === 'added' || line.type === 'removed'}
                                    onclick={() => line.type !== 'context' && xmlTool.toggle_selected_line(line)}
                                >
                                    {#if line.type === 'added' || line.type === 'removed'}
                                        <input 
                                            type="checkbox" 
                                            checked={line.selected} 
                                            onchange={() => xmlTool.toggle_selected_line(line)}
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
        {:else if active_tab === 'result' && xmlTool.result}
            <div class="diff-viewer">
                <h3>Final XML Result</h3>
                <div class="code-editor">
                    <div class="code-content">
                        <div class="line-numbers">
                            {#each xmlTool.result.split('\n') as _, i}
                                <div class="line-number">{i + 1}</div>
                            {/each}
                        </div>
                        <div class="editor-content">
                            <textarea 
                                spellcheck="false"
                                bind:value={xmlTool.result}
                                rows={xmlTool.result.split('\n').length}
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
    
    <style>
        .editors {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }
    
        .input-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
    
        .input-group label {
            color: #cdd6f4;
            font-size: 0.9em;
        }
    
        input[type="file"] {
            background: #1e1e2e;
            color: #cdd6f4;
            padding: 0.5rem;
            border: 1px solid #45475a;
            border-radius: 4px;
            cursor: pointer;
        }
    
        input[type="file"]:hover {
            border-color: #89b4fa;
        }
        
        .diff-viewer {
            margin-top: 1rem;
            background: #1e1e2e;
            border-radius: 4px;
            border: 1px solid #45475a;
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
            background-color: transparent;  /* Remove default background */
            color: #a6e3a1;
        }
    
        .diff-line.removed {
            background-color: transparent;  /* Remove default background */
            color: #f38ba8;
        }
    
        .diff-line.context {
            color: #6c7086;
            cursor: default;  /* Remove pointer cursor for context lines */
        }
    
        .diff-line.selected.added {
            background-color: #26332d;
        }
    
        .diff-line.selected.removed {
            background-color: #332526;
        }
    
        .diff-line.selected {
            outline: 2px solid #89b4fa;
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
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
    
        .tabs button {
            background-color: #313244;
            color: #cdd6f4;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px 4px 0 0;
            cursor: pointer;
            margin: 0;
        }
    
        .tabs button.active {
            background-color: #89b4fa;
            color: #1e1e2e;
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
            max-height: 600px;
            background: #1e1e2e;
            border: 1px solid #45475a;
            border-radius: 4px;
            overflow: hidden;
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
    
        .diff-line.added.selected {
            background-color: #1c4532;
            outline: 2px solid #a6e3a1;
        }
    
        .diff-line.removed.selected {
            background-color: #4c1d24;
            outline: 2px solid #f38ba8;
        }
    
        .diff-line.clickable:hover {
            opacity: 0.9;
            outline: 1px solid #89b4fa;
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
            background-color: #1c4532;
            color: #a6e3a1;
            border: 1px solid #a6e3a1;
        }

        .toggle-button.removed {
            background-color: #4c1d24;
            color: #f38ba8;
            border: 1px solid #f38ba8;
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
    </style>
