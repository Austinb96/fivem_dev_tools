<script lang="ts">
    import Navigation from "$lib/components/Navigation.svelte";
    import Toast from "$lib/components/Toast.svelte";
    import Updater from "$lib/components/Updater.svelte";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount } from "svelte";
    import {  codewalkercli } from "../codewalkercli.svelte";
    import { settings } from "../settings.svelte";
    
    onMount(() => {
        const listeners = [] as UnlistenFn[];
        (async () => {
            await settings.wait_for_ready();
            listeners.push(await listen<string>("cli-output", (event) => {
                codewalkercli.output.push(event.payload);
            }));
            listeners.push(await listen<string>("cli-error", (event) => {
                codewalkercli.output.push(event.payload);
            }));

            codewalkercli.start();
        })();

        return () => {
            for (const listener of listeners) {
                listener();
            }
            codewalkercli.stop();
        };
    });
</script>

<main id="container">
    <Updater/>    
    <Navigation></Navigation>
    <Toast/>
    <div id="content">
        <slot/>
    </div>
</main>

<style>
    #container {
        display: flex;
    }
    
    #content {
        flex: 1;
        padding: 1rem;
    }
</style>
