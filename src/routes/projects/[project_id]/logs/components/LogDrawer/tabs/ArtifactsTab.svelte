<script lang="ts">
  import { Download, FileArchive, FileText, FileCode } from 'lucide-svelte';

  interface Props {
    executionId: string;
  }

  let { executionId: _executionId }: Props = $props();

  // Mock artifacts - will be fetched from API
  const artifacts = [
    {
      name: 'dist.zip',
      size: '45.2 MB',
      type: 'archive',
      icon: FileArchive,
      downloadUrl: '#'
    },
    {
      name: 'test-report.html',
      size: '1.2 MB',
      type: 'report',
      icon: FileText,
      downloadUrl: '#'
    },
    {
      name: 'coverage.json',
      size: '256 KB',
      type: 'json',
      icon: FileCode,
      downloadUrl: '#'
    }
  ];

  function handleDownload(artifact: (typeof artifacts)[0]) {
    // TODO: Implement actual download
    console.log('Downloading:', artifact.name);
  }
</script>

<div class="p-6">
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-gray-900">Build Artifacts</h3>

    {#if artifacts.length === 0}
      <div class="py-12 text-center text-gray-500">
        <p>No artifacts available for this execution</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each artifacts as artifact (artifact.name)}
          {@const Icon = artifact.icon}
          <div
            class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
          >
            <div class="flex items-center gap-3">
              <Icon class="h-8 w-8 text-gray-400" />
              <div>
                <p class="font-medium text-gray-900">{artifact.name}</p>
                <p class="text-sm text-gray-500">{artifact.size}</p>
              </div>
            </div>

            <button
              onclick={() => handleDownload(artifact)}
              class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <Download class="h-4 w-4" />
              Download
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="border-t pt-4">
      <p class="text-sm text-gray-500">
        Artifacts are stored for 30 days after execution completion.
      </p>
    </div>
  </div>
</div>
