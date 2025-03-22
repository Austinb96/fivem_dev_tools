<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { modelviewer } from '$lib/model_viewer/modelview.svelte';
    import { open } from '@tauri-apps/plugin-dialog';
    import { settings } from '../../settings.svelte';
    import { toast } from '../../toast.svelte';
    
    let container: HTMLElement = $state();
    let loading = $state(false);
    let currentModel = $state('');
    let loadingProgress = $state(0);
    
    $effect(() => {
            console.log("Setting movement speed to", modelviewer.camera_move_speed);
            if (modelviewer.scene) {
                
                modelviewer.scene.set_movement_speed(modelviewer.camera_move_speed);
            }
        })
    
    onMount(() => {
        modelviewer.initialize(container);
    });
    
    onDestroy(() => {
    });
    
    async function handleFileInput() {
        try {
            const selected = await open({
                multiple: false,
                directory: false,
                filters: [{
                    name: 'Model Files',
                    extensions: ['xml', 'obj', "ymap"]
                }]
            });
            
            if (!selected) return;
            
            loading = true;
            loadingProgress = 0;
            currentModel = selected as string;
            await modelviewer.load_model(selected as string);
            
        } catch (e) {
            toast.add({
                text: `Error loading model: ${e}`,
                type: 'error',
            });
            console.error('Error loading model:', e);
        } finally {
            loading = false;
        }
    }
</script>

<div class="container">
    <div class="header">
        <div class="file-controls">
            <input 
                type="text" 
                class="file-path"
                value={currentModel}
                placeholder="No model loaded"
                readonly
            />
            <button 
                class="action-btn"
                onclick={handleFileInput}
            >
                Load Model
            </button>
        </div>
    </div>
    
    <div class="viewer-container" bind:this={container}>
        <div id="info-panel">
            <div id="info-camera-settings">
                <label for="fov">Camera Speed {modelviewer.camera_move_speed}</label>
                <input type="range" id="fov" min="0" max={modelviewer.max_camera_speed} step="0.01" bind:value={modelviewer.camera_move_speed} />
            </div>
        </div>
        {#if loading}
            <div class="loading">Loading model... {loadingProgress.toFixed(1)}%</div>
        {/if}
    </div>
</div>

<style>
    .container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    
    .header {
        padding: 1rem;
        background: #1e1e2e;
        border-bottom: 1px solid #313244;
    }
    
    .file-controls {
        display: flex;
        gap: 0.5rem;
    }
    
    .file-path {
        flex: 1;
        padding: 0.5rem;
        background: #313244;
        color: #cdd6f4;
        border: none;
        border-radius: 4px;
    }
    
    .action-btn {
        padding: 0.5rem 1rem;
        background: #89b4fa;
        color: #1e1e2e;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    }
    
    .action-btn:hover {
        background: #b4befe;
    }
    
    .viewer-container {
        flex: 1;
        position: relative;
        background: #1e1e2e;
    }
    
    .loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #cdd6f4;
        font-size: 1.2rem;
    }
    
    #info-panel {
        position: absolute;
        top: 0;
        right: 0;
        padding: 1rem;
        background: #1e1e2e;
        color: #cdd6f4;
    }
    
    #info-camera-settings {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    #info-camera-settings label {
        font-size: 0.8rem;
    }
</style>
