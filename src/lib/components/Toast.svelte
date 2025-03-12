<script lang="ts">
    import { fade } from 'svelte/transition';
    import { toast } from '../../toast.svelte';
</script>

{#if toast.messages.length > 0}
    {#each toast.messages as message, i (message)}
        <button type="button" class="toast {message.type}"
            in:fade={{duration: 300}}
            out:fade={{duration: 300}}
            onclick={() => toast.remove(i)}
        >
            <span class="icon">{message.type === 'success' ? '✔' : '✖'}</span>
            <span>{message.text}</span>
        </button>
    {/each}
{/if}

<style>
    .toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        color: #1e1e2e;
        font-size: 0.9em;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .success {
        background: #a6e3a1;
    }

    .error {
        background: #f38ba8;
    }

    .icon {
        font-weight: bold;
    }
</style>
