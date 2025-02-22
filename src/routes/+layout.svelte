<script lang="ts">
    import Navigation from "$lib/components/Navigation.svelte";
</script>


<main id="container">
    <Navigation></Navigation>
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
