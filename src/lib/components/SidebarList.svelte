<script>
  import { onMount } from "svelte";
  import { Icon } from 'svelte-icons-pack';
  import { AiOutlineSearch } from "svelte-icons-pack/ai"; 
  import { BiNetworkChart } from "svelte-icons-pack/bi";
  import { IoSearchCircleSharp } from "svelte-icons-pack/io"; 
  import { BsMegaphone } from "svelte-icons-pack/bs";
  export let funderMatches = [];
  export let relatedFundersList = null;
  export let searchTerm = '';
  export let suggestions = [];
  export let selectFunder = () => {};
  export let sortedFunders = [];
  export let sortCriterion = "relevance"; // New variable for sort order
  export let selectedDataSource = null;

  let localFunderMatches = [];

  onMount(() => {
    localFunderMatches = [...funderMatches];
    updateSuggestions();
    sortFunderMatches();
  });

  // Reactive statement to update matches when selectedDataSource changes
  $: if (selectedDataSource) {
    localFunderMatches = [...funderMatches];
    sortFunderMatches();
  }
  
  // Reactive statement to sort funder matches whenever funderMatches changes
  $: funderMatches, sortFunderMatches();


  function sortFunderMatches() {

    if (sortCriterion === "relevance") {
      localFunderMatches = [...localFunderMatches].sort((a, b) => b.similarity_score - a.similarity_score);
    } else if (sortCriterion === "alphabetical") {
      localFunderMatches = [...localFunderMatches].sort((a, b) => a.funder_name.localeCompare(b.funder_name));
    }

    console.log(localFunderMatches);
  }

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

  function updateSuggestions() {
    if (searchTerm.length > 0) {
      suggestions = sortedFunders
        .map(funder => ({
          ...funder,
          relevance: calculateRelevance(funder.funder_name, searchTerm) // Updated property
        }))
        .filter(funder => funder.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance || b.ad_count - a.ad_count);
      
      if (relatedFundersList) {
        relatedFundersList.scrollTop = 0;
      }
    } else {
      suggestions = [];
    }
  }

</script>

{#if selectedDataSource !== 'By Entire Library'}

<div class="embedded-search-container">
  <Icon src={AiOutlineSearch} size={20} color="#ccc" className="icon" />
  <input
    type="text"
    spellcheck="false"
    autocomplete="off"
    bind:value={searchTerm}
    on:input={updateSuggestions}
    placeholder="Search for a funder"
    class="search-input-embedded"
  />
</div>
{/if}


<div class="funders-container">
  <!-- Search Results Section -->
  {#if searchTerm.length > 0 && selectedDataSource !== 'By Entire Library'}
    <div class="section search-section">
      <h3 class="related-funders-h3">
        <Icon src={IoSearchCircleSharp} size={20} color="#ccc" className="icon" />
        Search results 
      </h3>
      <ul class="related-funders-list" bind:this={relatedFundersList}>
        {#if suggestions.length > 0}
          {#each suggestions as suggestion (suggestion.id)}
            <li
              on:click={() => selectFunder(suggestion)}
              class="related-funder-item"
            >
              <span class="related-funder-name">{suggestion.funder_name}</span> <!-- Updated property -->
            </li>
          {/each}
        {:else}
          <li class="no-results">No results found.</li>
        {/if}
      </ul>
    </div>
  {/if}
  
  <!-- Related Funders Section -->
  <div class="section related-section" class:full-height={searchTerm.length === 0}>
      <!-- Sorting Dropdown -->
       {#if selectedDataSource !== 'By Entire Library'}

      <h3 class="related-funders-h3">
        <Icon src={BiNetworkChart} size={20} color="#ccc" className="icon" />
        Similar funders 
      </h3>
      {/if}
      {#if selectedDataSource === 'By Entire Library'}

      <h3 class="related-funders-h3">
        <Icon src={BsMegaphone} size={20} color="#ccc" className="icon" />
        Loudest voices
      </h3>
      
      <div class="sort-dropdown">
        <label for="sortSelect">Sort by: </label>
        <select id="sortSelect" bind:value={sortCriterion} on:change={sortFunderMatches}>
          <option value="relevance">Number of ads</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>
      {:else}

      <div class="sort-dropdown">
        <label for="sortSelect">Sort by: </label>
        <select id="sortSelect" bind:value={sortCriterion} on:change={sortFunderMatches}>
          <option value="relevance">Relevance</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>
      {/if}


    
    <ul class="related-funders-list">
      {#each localFunderMatches as match (match.funder_id)}
        <li
          on:click={() => selectFunder({ name: match.funder_name, id: match.funder_id })}
          class="related-funder-item"
        >
          <span class="related-funder-name">{match.funder_name}</span>
        </li>
      {/each}
    </ul>
  </div>
</div>


<style>

.sort-dropdown {
  display: flex;
  align-items: center;
  margin-bottom: 0.2rem;
  font-size: 0.6rem;
  margin-left: 0.5rem;
  color: #ccc;


}

.sort-dropdown select {
  appearance: none;
  margin-left: 0.5rem;
  padding: 0.2rem 0.3rem;
  background: none;
  border: 1px solid #ccc;
  box-shadow: none;
  border-radius: 5px;
}
.funders-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 70%; /* Fill available height */
}

.section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; /* Important for flex containers with scrolling children */
}

.full-height {
  height: 100%; /* Take up full height when it's the only section */
}

.related-funders-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1; /* Fill remaining space */
  min-height: 0; /* Important for scrolling to work properly */
}

/* Rest of your styles remain the same */
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
  border-bottom: none;
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
  margin-bottom: 0.5rem;
  margin-left: 0.3rem;
  font-size: 1rem;
  font-weight: bold;
  display: flex;
    align-items: center; /* Vertically centers the icon */
    gap: 8px; /* Adjusts spacing between text and icon */

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

.embedded-search-container:focus-within {
  border: 1px solid #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
}

input {
  background: none;
  border: none;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  outline: none;
  box-shadow: none;
  flex: 1;
  color: rgb(236, 236, 236);
}

input:focus {
  border: none;
  box-shadow: none;
  outline: none;
}
</style>