<script lang="ts">
  import '../app.css';
  import codecateLogo from '$lib/assets/codecat-logo.svg';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={codecateLogo} />
</svelte:head>

{@render children?.()}
