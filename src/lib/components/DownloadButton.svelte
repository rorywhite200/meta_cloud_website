<script>
    export let mappingsFilteredByKeyword = {};
    export let relevantAdMappings = {};
    let isLoading = false;
  
    async function handleDownload() {
      try {
        isLoading = true;
        
        // Determine which mapping object to use
        const mappings = Object.keys(mappingsFilteredByKeyword).length > 0 
          ? mappingsFilteredByKeyword 
          : relevantAdMappings;
  
        // Extract original_ids from the mappings
        const originalIds = Object.values(mappings)
          .map(mapping => mapping.original_id)
          .filter(Boolean);
  
        // Make request to SvelteKit API endpoint
        const response = await fetch('/api/export-ads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: originalIds })
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
  
        // Receive CSV data as a blob and trigger download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `ads_${date}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
  
      } catch (error) {
        console.error('Error downloading data:', error);
        alert('Failed to download data. Please try again.');
      } finally {
        isLoading = false;
      }
    }
  </script>
  
  <button 
    on:click={handleDownload} 
    disabled={isLoading}
    class:loading={isLoading}
  >
    {#if isLoading}
      Preparing Download...
    {:else}
    {#if Object.keys(mappingsFilteredByKeyword).length > 0}
      Export {Object.keys(mappingsFilteredByKeyword).length} ads to CSV
    {:else}
      Export {Object.keys(relevantAdMappings).length} ads to CSV
      {/if}
    {/if}
  </button>


  <style>
    button {
      white-space: nowrap;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      font-weight: 700;
      border: 1px solid #4c6669;
      color: #c3c3c3;
      font-size: 0.85rem;
      box-shadow: rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px;
      transition: 0.3s background-color, 0.3s color;
    }
  
    button:hover:not(:disabled) {
      background-color: rgb(63, 59, 59);
      color: #f8f8f8;
    }
  
    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  
    button.loading {
      background-color: #4c6669;
      color: #f8f8f8;
      cursor: wait;
    }
  </style>