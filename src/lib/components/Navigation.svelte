<script lang="ts">
import { goto } from "$app/navigation";
import { updater } from "../../updater.svelte";

let isCollapsed = true;

// Define navigation links
const navLinks = [
	{ name: "Find Vector", path: "/closest_vector", icon: "🔍" },
	{ name: "Duplicate Files", path: "/duplicate_files", icon: "📂" },
    { name: "Popgroups Editor", path: "/popgroups_editor", icon:  "📋" },
    { name: "Diff Tool" , path: "/diff_editor", icon: "🔃" },
	{ name: "Settings", path: "/settings", icon: "⚙️" },
];

function toggleSidebar() {
	isCollapsed = !isCollapsed;
}
</script>

<div class="sidebar {isCollapsed ? 'collapsed' : ''}">
	<button class="toggle-btn" onclick={toggleSidebar}>
		{isCollapsed ? "🛠️" : "⬅️"}
	</button>

	<ul class="nav-list">
		{#each navLinks as link}
			<a href={link.path} class="nav-item" onclick={() => goto(link.path)}>
				<span class="icon">{link.icon}</span>
				<span class="label">{link.name}</span>
			</a>
		{/each}
	</ul>
	
    {#if !isCollapsed}
        <div id="version-info" class="text-center">
            {#if updater.update}
                <button class="update-available" onclick={() => updater.skip = false} title="Update available">
                    <span class="current">v{updater.current_version}</span>
                    <span class="new-version">(*v{updater.update.version})</span>
                </button>
            {:else}
                <span class="no-update">v{updater.current_version}</span>
            {/if}
        </div>
    {/if}
    
</div>

<style>
	:root {
		--bg-color: #1e1e2e;
		--primary-color: #f7768e;
		--hover-color: #ff9e64;
		--text-color: #cdd6f4;
		--border-color: #313244;
	}

	.sidebar {
		position: sticky;
		width: 250px;
		height: 100vh;
		background: var(--bg-color);
		padding: 15px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		left: 0;
		top: 0;
		transition: width 0.2s ease-in-out;
		border-right: 2px solid var(--border-color);
		box-shadow: 2px 0px 10px rgba(0, 0, 0, 0.3);
	}

	.collapsed {
		width: 60px;
	}

	.toggle-btn {
		background: var(--primary-color);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		width: 100%;
        aspect-ratio: 1/1;
        max-width: 400px;
        max-height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s ease-in-out;
	}

	.toggle-btn:hover {
		background: var(--hover-color);
	}

	.nav-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.nav-item {
		display: flex;
		align-items: center;
        margin: 15px 0;
		color: var(--text-color);
		font-size: 1rem;
		border-radius: 5px;
		transition: background 0.2s ease-in-out;
		cursor: pointer;
		text-decoration: none;
	}

	.nav-item:hover {
		background: var(--hover-color);
		color: #1e1e2e;
	}

	.icon {
		font-size: 1.2rem;
	}

	.label {
		transition: opacity 0.2s ease-in-out;
	}

	.collapsed .label {
		display: none;
	}

	.collapsed .nav-item {
		justify-content: center;
	}

	.collapsed .icon {
		font-size: 1.5rem;
	}

	#version-info {
        margin-top: auto;
        font-size: 0.9rem;
        color: var(--text-color);
        text-align: center;
        padding: 10px;
    }

    .update-available {
        background: rgba(50, 205, 50, 0.2); /* Light green */
        color: #32cd32; /* Lime green */
        border: none;
        border-radius: 5px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-weight: bold;
        font-size: 1rem;
        cursor: pointer;
        width: 100%;
    }

    .no-update {
        opacity: 0.8;
    }

    .current {
        color: var(--text-color);
        font-weight: normal;
    }

    .new-version {
        color: #32cd32;
        font-weight: bold;
    }
</style>
