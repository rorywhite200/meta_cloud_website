<script>
  import { onMount, onDestroy } from 'svelte';
  import funders from '$lib/funder_counts.json';
  import { Slider } from "$lib/components/ui/slider";
  import BarChart from "$lib/components/BarChart.svelte";
  import { fade } from 'svelte/transition';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Wordcloud from '$lib/components/Wordcloud.svelte';
  import SidebarList from '$lib/components/SidebarList.svelte';
  import Topics from '$lib/components/Topics.svelte';
  
  import { writable } from 'svelte/store';

  // State Variables
  let width = 800;
  let height = 300;
  let words = [];
  let selectedFunder = null;
  let funderTopics = [];
  let funderMatches = [];
  let searchTerm = '';
  let wordSearchTerm = ''; // Word cloud search term
  let suggestions = [];
  let relatedFundersList;

  // Variables for top keywords by month
  let topKeywordsByMonth = {};
  let availableMonths = [];
  let selectedMonthIndices = []; // [startIndex, endIndex]
  let previousSelectedMonthIndices = [];
  let sliderValue = []; // Temporary slider value
  let isLoading = false; // Loading indicator
  let aggregatedKeywords = null;
  let errorMessage = ''; // Error message state

  // Variables for top topics by month
  let topTopicsByMonth = {};

  // Sort funders by ad_count in descending order
  const sortedFunders = funders.sort((a, b) => b.ad_count - a.ad_count);

  // Ad Data Variables
  let adData = []; // Raw ad data
  let filteredAdData = []; // Filtered ad data based on date range

  onMount(() => {
    selectFunder({'name': 'Conservative Party of Canada - Parti conservateur du Canada', 'id': '67'});

    if (typeof window !== 'undefined') {
      updateWidth();
      window.addEventListener('resize', updateWidth);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateWidth);
    }
  });

  function updateWidth() {
    width = window.innerWidth * 0.37;
    height = window.innerHeight * 0.20;
  }

  // Function to handle funder selection
  async function selectFunder(funder) {
    // Clear any pending debounce timers
    clearTimeout(debounceTimeout);

    selectedFunder = funder;
    searchTerm = ''; // Clear search term when selecting a funder
    await loadFunderData(selectedFunder.id);

    if (relatedFundersList) {
      relatedFundersList.scrollTop = 0;
    }
  }

  // Aggregate Keywords Function (Without Caching)
  function aggregateKeywords(startIndex, endIndex) {
    if (startIndex < 0 || endIndex >= availableMonths.length || startIndex > endIndex) {
      console.warn('Invalid indices for aggregating keywords:', startIndex, endIndex);
      return [];
    }

    const aggregated = {};

    for (let i = startIndex; i <= endIndex; i++) {
      const month = availableMonths[i];
      const keywords = topKeywordsByMonth[month] || [];
      keywords.forEach(({ keyword, count }) => {
        const key = keyword.toLowerCase();
        if (aggregated[key]) {
          aggregated[key] += count;
        } else {
          aggregated[key] = count;
        }
      });
    }

    // Convert aggregated object to array
    return Object.entries(aggregated).map(([text, count]) => ({
      text,
      count
    }));
  }

  // Async function to load the selected funder's data
  async function loadFunderData(funderId) {
    try {
      isLoading = true; // Start loading
      errorMessage = ''; // Reset error message

      // Load Ad Data
      const adResponse = await import(`$lib/total_ads_funders/${funderId}.json`);
      adData = adResponse.default;

      // Load other funder data
      const response2 = await import(`$lib/funder_similarity/${funderId}.json`);
      funderMatches = response2.default.similar_funders; // Ensure top 20 funders

      // Load top keywords by month
      const keywordsResponse = await import(`$lib/top_keywords_by_month/${funderId}.json`);
      topKeywordsByMonth = keywordsResponse.default;

      // Load top topics by month
      const topicsResponse = await import(`$lib/top_topics_by_month/${funderId}.json`);
      topTopicsByMonth = topicsResponse.default;

      // Extract and sort available months
      availableMonths = Object.keys(topKeywordsByMonth).sort((a, b) => new Date(a) - new Date(b));

      if (availableMonths.length > 0) {
        selectedMonthIndices = [0, availableMonths.length - 1];
        sliderValue = [0, availableMonths.length - 1];
      }

      // Aggregate keywords for the initial range
      aggregatedKeywords = aggregateKeywords(0, availableMonths.length - 1);

      // Initially filter ad data based on the full range
      filterAdData();

      isLoading = false; // Loading complete
    } catch (error) {
      console.error('Error loading funder data:', error);
      errorMessage = 'Failed to load data. Please try again later.';
      isLoading = false; // Ensure loading flag is reset on error
    }
  }

  // Function to filter ad data based on selected month range
  function filterAdData() {
    if (!adData || adData.length === 0) {
      filteredAdData = [];
      return;
    }
    
    const [startIndex, endIndex] = selectedMonthIndices;
    if (startIndex < 0 || endIndex >= availableMonths.length || startIndex > endIndex) {
      filteredAdData = adData;
      console.warn('Invalid month indices, using all adData');
      return;
    }
    
    const startMonth = new Date(availableMonths[startIndex]);
    const endMonth = new Date(availableMonths[endIndex]);
    endMonth.setMonth(endMonth.getMonth() + 1); // Include the entire end month

    filteredAdData = adData.filter(({ week_start }) => {
      const weekDate = new Date(week_start);
      return weekDate >= startMonth && weekDate < endMonth;
    });
  }

  let debounceTimeout;

  // Improved reactive statement with explicit dependencies
$: if (selectedMonthIndices && !isLoading && selectedMonthIndices.length === 2) {
  const [currentStart, currentEnd] = selectedMonthIndices;
  const [prevStart, prevEnd] = previousSelectedMonthIndices;

  if (currentStart !== prevStart || currentEnd !== prevEnd) {
    previousSelectedMonthIndices = [...selectedMonthIndices];
    
    filterAdData();
    
    aggregatedKeywords = aggregateKeywords(currentStart, currentEnd);
  }
}

$: if (sliderValue.length === 2 && !isLoading) {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    const [newStart, newEnd] = sliderValue;
    if (
      newStart !== selectedMonthIndices[0] ||
      newEnd !== selectedMonthIndices[1]
    ) {
      selectedMonthIndices = [...sliderValue];
    }
  }, 300); // Increased debounce time for better performance
}


</script>

<!-- Main Container using Grid Layout -->
<div class="main-container" in:fade>
  <Sidebar>
    {#if funderMatches.length > 0 || searchTerm.length > 0}
      <SidebarList 
        funderMatches={funderMatches} 
        searchTerm={searchTerm} 
        suggestions={suggestions} 
        selectFunder={selectFunder} 
        sortedFunders={sortedFunders} 
      />
    {/if}
  </Sidebar>

  <!-- Header -->
  <h2>{selectedFunder ? selectedFunder.name : 'Select a funder'}</h2>

  <div class="barchart-container" style="min-height: {height + 40}px;">
    <h3>Number of Ads Launched by Week</h3>
    <BarChart 
      data={filteredAdData} 
      width={900} 
      height={height} 
      marginTop={5} 
      marginRight={0} 
      marginBottom={50} 
      marginLeft={60}
    />
    <div class="slider-container">
      {#if availableMonths.length > 0 && !isLoading}
        <Slider
          min={0}
          max={availableMonths.length - 1}
          step={1}
          bind:value={sliderValue}
        />
      {/if}
    </div>
  </div>

  <div class="bottom-row">
    <Wordcloud 
      {words} 
      {wordSearchTerm} 
      {width} 
      {height} 
      {availableMonths} 
      {selectedMonthIndices} 
      {selectedFunder} 
      {topKeywordsByMonth} 
      {aggregatedKeywords} 
    />
    <Topics 
      {topTopicsByMonth} 
      {availableMonths} 
      {selectedMonthIndices} 
      {selectedFunder} 
    />
  </div>
</div>

<style>
  /* General Styles */
  .main-container {
    display: grid;
    grid-template-rows: auto auto 1fr;
    grid-gap: 1rem;
    padding: 2rem;
    margin-left: 22%; /* To account for the sidebar width */
    /* Adjust margin-left based on sidebar width if necessary */
  }

  /* Header */
  .main-container > h2 {
    color: rgb(236, 236, 236);
    font-size: 1.5rem;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-weight: 700;
  }

  /* Slider Container */
  .slider-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-left: 3rem;
    margin-right: 3rem;
    min-height: 0.4rem;
  }

  /* Bottom Row: Word Cloud and Topics */
  .bottom-row {
    display: grid;
    grid-template-columns: 2fr 1fr; /* Adjusted to accommodate the bar chart */
    grid-gap: 2rem;
    align-items: start;
    margin-top: 2rem;
    position: relative; /* Changed from absolute to relative for better layout control */
  }

  /* Bar Chart Container */
  .barchart-container {
    border: 1px solid #e0d24c;
    border-radius: 20px;
    background-color: rgb(51, 51, 51);
    box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, 
                rgba(0, 0, 0, 0.12) 0px -12px 30px, 
                rgba(0, 0, 0, 0.12) 0px 4px 6px, 
                rgba(0, 0, 0, 0.17) 0px 12px 13px, 
                rgba(0, 0, 0, 0.09) 0px -3px 5px;
    padding: 1rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    margin-top: 1rem;
  }

  .barchart-container h3 {
    color: rgb(236, 236, 236);
    margin: 0;
    margin-bottom: 1rem;
    text-align: left;
    margin-left: 1rem;
  }

  /* Loader Styles */
  .loader {
    color: rgb(236, 236, 236);
    text-align: center;
    margin-top: 2rem;
    font-size: 1.2rem;
  }

  /* Error Message Styles */
  .error-message {
    color: red;
    text-align: center;
    margin-top: 2rem;
    font-size: 1.2rem;
  }

  /* Responsive Adjustments */
  @media (max-width: 1200px) {
    .main-container {
      margin-left: 20%;
      padding: 1.5rem;
    }

    .bottom-row {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 768px) {
    .main-container {
      margin-left: 0;
      padding: 1rem;
    }

    .bottom-row {
      grid-template-columns: 1fr;
    }
  }
</style>
