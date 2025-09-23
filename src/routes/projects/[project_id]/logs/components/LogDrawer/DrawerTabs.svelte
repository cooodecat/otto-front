<script lang="ts">
  import { FileText, GitMerge, Package } from 'lucide-svelte';

  interface Props {
    activeTab: 'logs' | 'pipeline' | 'artifacts';
  }

  let { activeTab = $bindable() }: Props = $props();

  const tabs = [
    { id: 'logs', label: 'Logs', icon: FileText, shortcut: '1' },
    { id: 'pipeline', label: 'Pipeline', icon: GitMerge, shortcut: '2' },
    { id: 'artifacts', label: 'Artifacts', icon: Package, shortcut: '3' }
  ] as const;
</script>

<div class="border-b border-gray-200 px-6">
  <nav class="flex space-x-6">
    {#each tabs as tab (tab)}
      {@const Icon = tab.icon}
      <button
        onclick={() => (activeTab = tab.id)}
        class="flex cursor-pointer items-center gap-2 border-b-2 px-1 py-3 transition-colors {activeTab ===
        tab.id
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
      >
        <Icon class="h-4 w-4" />
        <span class="font-medium">{tab.label}</span>
        <span class="text-xs text-gray-400">({tab.shortcut})</span>
      </button>
    {/each}
  </nav>
</div>
