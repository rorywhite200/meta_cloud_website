<script>
  import { onMount } from "svelte";
  import { Icon } from 'svelte-icons-pack';
  import { AiOutlineSearch } from "svelte-icons-pack/ai"; 
  import { flip } from 'svelte/animate'; // Import flip if needed
  import { fade } from 'svelte/transition'; // Import fade if needed

  export let funderMatches = [];
  export let relatedFundersList = null;
  export let searchTerm = '';
  export let suggestions = [];
  export let selectFunder = () => {};
  export let sortedFunders = [];

  onMount(() => {
    updateSuggestions();
  });

  function calculateRelevance(funderName, searchTerm) {
    const lowerFunderName = funderName.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    if (lowerFunderName.startsWith(lowerSearchTerm)) {
      return 3;
    } else if (lowerFunderName.includes(lowerSearchTerm)) {
      return 2;
    } else {
      const words = lowerSearchTerm.split(' ');
      for (const word of words) {
        if (lowerFunderName.includes(word)) {
          return 1;
        }
      }
    }
    return 0;
  }

  // Function to update suggestions
  function updateSuggestions() {
    if (searchTerm.length > 0) {
      suggestions = sortedFunders
        .map(funder => ({
          ...funder,
          relevance: calculateRelevance(funder.name, searchTerm)
        }))
        .filter(funder => funder.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance || b.ad_count - a.ad_count)
      
      if (relatedFundersList) {
        relatedFundersList.scrollTop = 0;
      }
    } else {
      suggestions = [];
    }
  }
</script>

<div class="embedded-search-container">
  <Icon src={AiOutlineSearch} size={20} color="#ccc" className="icon" />
  <input
    type="text"
    bind:value={searchTerm}
    on:input={updateSuggestions}
    placeholder="Search for a funder"
    class="search-input-embedded"
  />
</div>

<h3 class="related-funders-h3">{searchTerm.length > 0 ? 'Search Results' : 'Suggested funders'}</h3>

<!-- Display Search Results or Related Funders -->
<ul class="related-funders-list" bind:this={relatedFundersList}>
{#if searchTerm.length > 0}
  {#if suggestions.length > 0}
    {#each suggestions as suggestion (suggestion.id)}
      <li
        on:click={() => selectFunder(suggestion)}
        class="related-funder-item"
        in:fade={{ duration: 1000 }}
      >
        <span class="related-funder-name">{suggestion.name}</span>
      </li>
    {/each}
  {:else}
    <li class="no-results">No results found.</li>
  {/if}
{:else}
  {#each funderMatches as match (match.funder_id)}
    <li
      on:click={() => selectFunder({ name: match.funder_name, id: match.funder_id })}
      class="related-funder-item"
      in:fade={{ duration: 1000 }}
    >
      <span class="related-funder-name">{match.funder_name}</span>
    </li>
  {/each}
{/if}
</ul>

<style>
.related-funders-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
  max-height: 60%;
  overflow-x: hidden;
}

.related-funder-item {
  padding: 0.5rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgb(236, 236, 236);
}

.related-funder-item:last-child {
  border-bottom: none; /* Remove border from the last item */
}

.related-funder-item:hover {
  background: #e0d24c;
  color: rgb(51, 51, 51);
}

.related-funder-name {
  flex: 1;
  font-size: 0.80rem;
  text-transform: capitalize;
}

.no-results {
  padding: 0.5rem;
  color: #888;
  text-align: center;
}

.related-funders-h3 {
  color: rgb(236, 236, 236);
  margin-bottom: 1rem;
  margin-left: 0.3rem;
}

:global(.icon) {
  min-width: 16px;
  min-height: 16px;
}

.embedded-search-container {
  margin-bottom: 2rem;
  display: flex;
  justify-content: flex-start;
  font-family: inherit;
  padding: 0.5rem 0 0.5rem 0.5rem;
  font-size: 0.85rem;
  border: 1px solid #ccc;
  border-radius: 20px;
  background: none;
  color: rgb(236, 236, 236);
  outline: none;
  transition: border 0.3s, box-shadow 0.3s;
}

.embedded-search-container:focus {
  border: 1px solid #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
}

input {
  background: none;
  border: none;
  margin-left: 0.5rem;
  margin-right: 0;
  outline: none;
  box-shadow: none;
  flex: 1; /* Ensure input takes available space */
}

input:focus {
  border: none;
  box-shadow: none;
  outline: none;
}
</style>
