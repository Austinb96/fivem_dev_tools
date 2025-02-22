<script lang="ts">
    import { updater } from "../../updater.svelte";
</script>

{#if !updater.skip && updater.update}
	<div id="updater-container">
		<div class="card">
			<div class="accent"></div>
			<div class="card-content">
                <button class="close" onclick={() => updater.skip = true}>X</button>
				<h3>Update available v{updater.update.version}</h3>
				<p>{updater.update.releaseNotes}</p>
				{#if updater.isDownloading}
					<div class="progress-container">
						<div class="progress-bar" style="width: {updater.progress}%"></div>
					</div>
					<p>{Math.round(updater.progress)}% downloaded</p>
				{:else}
					<button onclick={updater.install}>Install & Restart</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	#updater-container {
		position: fixed;
		bottom: 15px;
		right: 15px;
		z-index: 1000;
	}

	.card {
		display: flex;
		align-items: stretch;
		background: #fff;
		overflow: hidden;
		width: 300px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.accent {
		background-color: #28a745; /* Accent color on left */
		width: 5px;
	}

	.card-content {
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}

	h3 {
		margin: 0 0 10px;
		font-size: 1.2rem;
		color: #333;
	}

	button {
		padding: 10px 20px;
		background-color: #28a745;
		color: #fff;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		transition: background-color 0.3s;
		width: 90%;
	}

	button:hover {
		background-color: #218838;
	}

	.progress-container {
		width: 100%;
		height: 20px;
		background: #e9ecef;
		overflow: hidden;
		margin-bottom: 10px;
	}

	.progress-bar {
		height: 100%;
		background-color: #28a745;
		width: 0;
		transition: width 0.3s;
	}

	p {
		margin: 0;
		font-size: 0.9rem;
		color: #555;
	}
    
    .close {
        position: absolute;
        top: 5px;
        right: 5px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        color: #333;
        width: 20px;
        height: 20px;
        padding: 0;
    }
    
    .close:hover {
        background-color: #ffffff00;
    }
</style>
