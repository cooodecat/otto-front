<script lang="ts">
  import '../app.css';
  import ottoLogo from '$lib/assets/otto-logo.svg';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={ottoLogo} />
</svelte:head>

{@render children?.()}
