<script>
  // This is the layout component for the settings routes
  export let segment;
</script>

<main>
  <slot></slot> <!-- This will render the specific route component like Models.svelte -->
</main>

<style>
  main {
    padding: 1rem;
  }
</style>
