<script lang="ts">
    import { codewalkercli } from "../../codewalkercli.svelte";
    import { invoke } from "@tauri-apps/api/core";

    let autoScroll = $state(true);
    let outputElement: HTMLPreElement;
    let commandInput = $state('');
    let suggestions = $state<string[]>([]);
    let suggestionIndex = $state(0);
    let lastSearch = $state("");
    let search_mode = $state(false);
    let filtered_suggestions : string[] = $derived(suggestions.filter(s => s.includes(lastSearch)))
    let history_index = $state(-1);
    
    $effect(() => { 
        if (codewalkercli.error) {
            scrollToBottom();
        }
        if (autoScroll && codewalkercli.output.length > 0) {
            scrollToBottom();
        }
    });

    function scrollToBottom() {
        if (!outputElement) return;
        setTimeout(() => {
            outputElement.scrollTop = outputElement.scrollHeight;
        }, 0);
    }

    function handleScroll() {
        if (!outputElement) return;
        const { scrollHeight, clientHeight, scrollTop } = outputElement;
        autoScroll = Math.abs(scrollHeight - clientHeight - scrollTop) < 2;
    }

    async function handleCommand(e: KeyboardEvent) {
        switch (e.key) {
            case 'Enter':
                codewalkercli.send_command(commandInput);
                search_mode = false;
                commandInput = '';
                break;
            case 'Tab':
                e.preventDefault();
                handleTabCompletion(e.shiftKey);
                break;
            case 'Escape':
                search_mode = false;
                break;
            case "Backspace":
                search_mode = false;
                break;
            case "/":
                search_mode = false;
                break;
            case "ArrowUp":
                history_index++;
                commandInput = codewalkercli.command_history[history_index] || commandInput;
                break
            case "ArrowDown":
                history_index--;
                commandInput = codewalkercli.command_history[history_index] || commandInput;
                break
            default:
                break;
        }
    }
    
    async function handleTabCompletion(reverse = false) {
        const last_arg = commandInput.split(' ').pop();
        if (!last_arg) return;
        if (last_arg !== lastSearch && !search_mode) {
            search_mode = true;
            suggestions = await fetch_suggestions(last_arg);
            lastSearch = last_arg;
            suggestionIndex = 0;
            console.log(suggestions);
        } else {
            if (reverse) {
                suggestionIndex = suggestionIndex === 0 ? filtered_suggestions.length - 1 : suggestionIndex - 1;
            } else {
                suggestionIndex = suggestionIndex === filtered_suggestions.length - 1 ? 0 : suggestionIndex + 1;
            }
        }
        
        if(filtered_suggestions.length === 0) return;
        const new_command = commandInput.split(' ');
        new_command.pop();
        new_command.push(filtered_suggestions[suggestionIndex]);
        commandInput = new_command.join(' ');
    }

    async function fetch_suggestions(search: string) {
        const response = await invoke('get_paths_in_dir', { path: search });
        return response as string[];
    }
</script>

<div class="cli-container">
    <div class="controls">
        <button onclick={() => codewalkercli.send_command("exportxml -h")}>Test CLI</button>
        <button onclick={codewalkercli.start}>Start CLI</button>
        <button onclick={codewalkercli.stop}>Stop CLI</button>
        <label>
            <input type="checkbox" bind:checked={autoScroll}>
            Auto-scroll
        </label>
    </div>
    
    <pre 
        class="output" 
        bind:this={outputElement}
        onscroll={handleScroll}
        style="resize: vertical"
    >{codewalkercli.output.join('')}</pre>

    <div class="input-container">
        <span class="prompt">></span>
        <input
            type="text"
            class="command-input"
            placeholder="Type a command..."
            bind:value={commandInput}
            spellcheck="false"
            onkeydown={handleCommand}
        />
    </div>
</div>  

<style>
    .cli-container {
        margin-top: 10px;
        padding: 12px;
        background: var(--bg-color);
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
    
    .controls {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .output {
        margin: 8px 0;
        padding: 8px;
        background: #1e1e1e;
        color: #d4d4d4;
        border: 1px solid #313244;
        border-radius: 4px;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: 'Consolas', monospace;
        height: 400px; /* Fixed height instead of min-height */
        max-height: 800px; /* Maximum height limit */
        min-height: 300px;
        overflow-y: auto;
        overflow-x: hidden;
        line-height: 1.4;
        resize: none; /* Update output style to remove resize since we have input below */
        margin-bottom: 0;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .output:empty::before {
        content: "No output yet...";
        color: #666;
        font-style: italic;
    }

    .input-container {
        display: flex;
        align-items: center;
        background: #1e1e1e;
        border: 1px solid #313244;
        border-radius: 4px;
        margin-top: 0;
        padding: 8px;
        border-top: none;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }

    .prompt {
        color: #569cd6;
        margin-right: 8px;
        font-family: 'Consolas', monospace;
        font-weight: bold;
    }

    .command-input {
        flex: 1;
        background: transparent;
        border: none;
        color: #d4d4d4;
        font-family: 'Consolas', monospace;
        font-size: 14px;
        outline: none;
    }

    .command-input::placeholder {
        color: #666;
        font-style: italic;
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
