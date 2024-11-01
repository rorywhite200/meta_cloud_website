<script>
  import { onMount, onDestroy } from 'svelte';
  import { Slider } from "$lib/components/ui/slider";
  import BarChart from "$lib/components/BarChart.svelte";
  import { fade } from 'svelte/transition';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import DownloadButton from '$lib/components/DownloadButton.svelte';
  import Wordcloud from '$lib/components/Wordcloud.svelte';
  import SidebarList from '$lib/components/SidebarList.svelte';
  import Topics from '$lib/components/Topics.svelte';
  
  // -------------------
  // State Variables
  // -------------------
  let width = 700;
  let height = 110;
  let words = [];
  let selectedFunder = null;
  let funderMatches = [];
  let searchTerm = '';
  let wordSearchTerm = ''; // Word cloud search term
  let suggestions = [];
  let relatedFundersList;
  let selectedTopic = null;
  
  // Variables for top keywords by month
  let topKeywordsByMonth = {};
  let availableMonths = [];
  let selectedMonthIndices = []; // [startIndex, endIndex]
  let previousSelectedMonthIndices = [];
  let sliderValue = []; // Temporary slider value
  let isLoading = false; // Loading indicator
  let aggregatedKeywords = null;
  let errorMessage = ''; // Error message state
  let topicMapping = null;
  let adMappingCache = new Map(); // Cache for monthly ad mappings
  let adMappings = {}; // Move this outside the function to make it globally accessible
  let filteredKeywords = [];
  let mappingsFilteredByKeyword = {};
  let relevantAdMappings = {};
  let relevantAdIds = new Set();
  let first = "";
  let last = "";
  
  // Variables for top topics by month
  let topTopicsByMonth = {};
  
  // Initialize 'funders' as an empty object
  let funders = {};
  
  // Derived sorted array of funders for display purposes
  let sortedFunders = [];
  
  // Ad Data Variables
  let adData = []; // Raw ad data
  let filteredAdData = []; // Filtered ad data based on date range
  
  let debounceTimeout;
  
  // -------------------
  // Dropdown Selection Variable
  // -------------------
  let selectedDataSource = "By Funder"; // Default selection
  let prevSelectedDataSource = selectedDataSource;

  let funderMonthsData;

  onMount(async () => {
     const monthsResponse = await fetch(`/data/funder_months.json`);
    funderMonthsData = await monthsResponse.json();
  });
  
  // -------------------
  // Function: Update Base URL
  // -------------------
  function updateBaseUrl() {
    switch (selectedDataSource) {
      case "By Complete Library":
        return "/data/keyword_analysis/";
      case "By Funder":
        return `/data/keyword_analysis/funders/${selectedFunder.id}`;
      case "By Page":
        return "/data/keyword_analysis/pages";
      default:
        return "/data/keyword_analysis/";
    }
  }
  
  // -------------------
  // Function: Load Funders
  // -------------------
  async function loadFunders() {
    try {
      const response = await fetch('/data/funders.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      funders = await response.json();
      
      // Create a sorted array from the funders object based on ad_count in descending order
      sortedFunders = Object.entries(funders)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.ad_count - a.ad_count);
        
    } catch (error) {
      console.error('Error loading funders:', error);
      errorMessage = 'Failed to load funders. Please try again later.';
    }
  }
  
  // -------------------
  // Function: Select Funder
  // -------------------
  async function selectFunder(funder) {
    // Clear any pending debounce timers
    clearTimeout(debounceTimeout);
    if (selectedFunder !== funder) {
      selectedDataSource = "By Funder";
      selectedFunder = funder;
      selectedTopic = null;
      searchTerm = ''; // Clear search term when selecting a funder
      await loadFunderData(selectedFunder.id);
  
      if (relatedFundersList) {
        relatedFundersList.scrollTop = 0;
      }
    }
  }
  
  // -------------------
  // Function: Aggregate Keywords
  // -------------------
  function aggregateKeywords(startIndex, endIndex) {
    // Early validation
    if (startIndex < 0 || endIndex >= availableMonths.length || startIndex > endIndex) {
      console.warn('Invalid indices for aggregating keywords:', startIndex, endIndex);
      return [];
    }
  
    // Pre-allocate array size for better performance
    const monthsToProcess = endIndex - startIndex + 1;
    const estimatedKeywords = monthsToProcess * 100; // Assume average 100 keywords per month
    const aggregated = new Map();
    
    // Avoid repeated property lookups
    const months = availableMonths.slice(startIndex, endIndex + 1);
    const keywordsByMonth = topKeywordsByMonth;
  
    // Process in chunks to avoid long-running loops
    const chunkSize = 3; // Process 3 months at a time
    for (let i = 0; i < months.length; i += chunkSize) {
      const chunk = months.slice(i, i + chunkSize);
      
      chunk.forEach(month => {
        const keywords = keywordsByMonth[month];
        if (!keywords) return;
  
        for (let j = 0; j < keywords.length; j++) {
          const { keyword, count, weighted_score, ...rest } = keywords[j];
          const key = keyword.toLowerCase();
          
          const existing = aggregated.get(key);
          if (existing) {
            existing.count += count;
            existing.weighted_score += weighted_score;
          } else {
            // Avoid spread operator for better performance
            const newEntry = {
              count: count,
              weighted_score: weighted_score,
              hash: rest.hash,
              ad_ids: rest.ad_ids
            };
            aggregated.set(key, newEntry);
          }
        }
      });
    }
  
    // Use more efficient array creation and sorting
    const result = new Array(aggregated.size);
    let idx = 0;
    
    aggregated.forEach((data, text) => {
      result[idx++] = {
        text,
        count: data.count,
        weighted_score: data.weighted_score,
        hash: data.hash,
        ad_ids: data.ad_ids
      };
    });
  
    // In-place sort is faster than creating new array
    return result.sort((a, b) => b.weighted_score - a.weighted_score);
  }
  
  // -------------------
  // Function: Load Topic Mapping
  // -------------------
  async function loadTopicMapping() {
    if (topicMapping) return topicMapping;
    
    try {
      const response = await fetch('/data/keyword_analysis/topic_index_mapping.json');
      if (!response.ok) throw new Error('Failed to load topic mapping');
      topicMapping = await response.json();
      return topicMapping;
    } catch (error) {
      console.error('Error loading topic mapping:', error);
      return null;
    }
  }
  
  // -------------------
  // Function: Load Monthly Ad Mapping
  // -------------------
  async function loadMonthlyAdMapping(month) {
    if (adMappingCache.has(month)) {
      return adMappingCache.get(month);
    }
    
    try {
      const response = await fetch(`/data/keyword_analysis/ad_id_mapping/${month}.json`);
      if (!response.ok) throw new Error(`Failed to load mapping for ${month}`);
      const data = await response.json();
      adMappingCache.set(month, data);
      return data;
    } catch (error) {
      console.error(`Error loading ad mapping for ${month}:`, error);
      return null;
    }
  }
  
  // -------------------
  // Function: Calculate Topic Affinities
  // -------------------
  async function calculateTopicAffinities(adMappings) {
    if (!topicMapping) {
      topicMapping = await loadTopicMapping();
      if (!topicMapping) return [];
    }
  
    const numTopics = Object.keys(topicMapping).length;
    const globalScores = new Float32Array(numTopics);
    const globalCounts = new Uint32Array(numTopics);
  
    Object.values(adMappings).forEach(ad => {
      if (!ad.topic_affinities) return;
  
      for (const [topicId, affinity] of Object.entries(ad.topic_affinities)) {
        const idx = parseInt(topicId, 10);
        globalScores[idx] += affinity;
        globalCounts[idx]++;
      }
    });
  
    const results = [];
    for (let i = 0; i < numTopics; i++) {
      if (globalCounts[i] > 0) {
        results.push({
          topic: topicMapping[i],
          score: globalScores[i] / globalCounts[i],
          count: globalCounts[i],
        });
      }
    }
  
    return results.sort((a, b) => b.score - a.score).filter(topic => topic.score > 0);
  }
  
  // -------------------
  // Function: Process Ad Mappings
  // -------------------
  function processAdMappings(adMappings) {
    // Group ads by week
    const weekCounts = {};
    
    Object.values(adMappings).forEach(ad => {
      if (ad.start_week) {
        weekCounts[ad.start_week] = (weekCounts[ad.start_week] || 0) + 1;
      }
    });
  
    // Convert to array format sorted by week
    return Object.entries(weekCounts)
      .map(([week_start, ad_count]) => ({
        week_start,
        ad_count
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));
  }
  
  // -------------------
  // Function: Load Funder Data
  // -------------------
  async function loadFunderData(funderId) {
    try {
      isLoading = true;
      errorMessage = '';
    
      // Load funder months data
      const monthsResponse = await fetch(`/data/funder_months.json`);
      if (!monthsResponse.ok) {
        throw new Error('Failed to fetch funder_months.json');
      }
      const funderMonthsData = await monthsResponse.json();

      const key = selectedDataSource === "By Complete Library" ? 'all' : funderId;

  
      // Check if the funderId exists in the funderMonthsData
      if (!funderMonthsData[funderId]) {
        throw new Error(`No months data available for funder ID ${key}`);
      }

      if (selectedDataSource === "By Complete Library") {
        first = funderMonthsData['all'].first;
        last = funderMonthsData['all'].last;
      } else {
        first = funderMonthsData[funderId].first;
        last = funderMonthsData[funderId].last;
      }
  
      availableMonths = getMonthsInRange(first, last);
  
      // Load funder similarity data
      const response2 = await fetch(`/data/funder_similarity/${funderId}.json`);
      if (!response2.ok) {
        throw new Error(`Failed to fetch funder_similarity/${funderId}.json`);
      }
      const response2Data = await response2.json();
      
      // Assuming similar_funders is now an object similar to 'funders'

      funderMatches = Object.entries(response2Data.similar_funders)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.ad_count - a.ad_count);
  
      // Determine base URL and folder path
      const baseUrl = updateBaseUrl();
      const folder = selectedTopic ? `${baseUrl}/topics/${selectedTopic}` : `${baseUrl}/combined`;
  
      // Load keyword data for each month
      topKeywordsByMonth = {};
      const keywordPromises = availableMonths.map(async (month) => {
        const keywordsResponse = await fetch(`${folder}/${month}.json`);
        if (!keywordsResponse.ok) {
          console.warn(`Failed to fetch keywords for month ${month}`);
          return null;
        }
        const monthData = await keywordsResponse.json();
  
        topKeywordsByMonth[month] = Object.entries(monthData.keywords).map(([hash, item]) => ({
          hash: hash,
          keyword: item.keyword,
          count: item.count,
          weighted_score: item.weighted_score,
          ad_ids: item.ad_ids
        }));
      });
  
      // Wait for all keyword data to be fetched
      await Promise.all(keywordPromises);
  
      // Load and cache ad mappings for each month into adMappings
      adMappings = {};
      const adMappingPromises = availableMonths.map(async (month) => {
        const monthMapping = await loadMonthlyAdMapping(month);
        if (monthMapping) {
          Object.assign(adMappings, monthMapping);
        }
      });
      await Promise.all(adMappingPromises);
  
      // Process ad mappings
      adData = processAdMappings(adMappings);
  
      if (availableMonths.length > 0) {
        
        selectedMonthIndices = [0, availableMonths.length - 1];
        sliderValue = [0, availableMonths.length - 1];
  
        // Calculate initial keywords
        aggregatedKeywords = aggregateKeywords(selectedMonthIndices[0], selectedMonthIndices[1]);
  
        const { adIds, mappings } = collectRelevantAds(selectedMonthIndices[0], selectedMonthIndices[1]);
        relevantAdIds = adIds;
        relevantAdMappings = mappings;
        
        filterAdData();
      }
  
    } catch (error) {
      console.error('Error loading funder data:', error);
      errorMessage = 'Failed to load data. Please try again later.';
      throw error;
    } finally {
      isLoading = false;
    }
  }
  
  // -------------------
  // Helper Function: Get Months in Range
  // -------------------
  function getMonthsInRange(start, end) {
    const [startYear, startMonth] = start.split('-').map(Number);
    const [endYear, endMonth] = end.split('-').map(Number);
    const months = [];
  
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;
  
      for (let month = monthStart; month <= monthEnd; month++) {
        months.push(`${year}-${String(month).padStart(2, '0')}`);
      }
    }
  
    return months;
  }
  
  // -------------------
  // Helper Function: Get All Weeks in Range
  // -------------------
  function getAllWeeksInRange(startDate, endDate) {
    const weeks = [];
    let currentDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
    
    // Set to the start of the week (Monday)
    const day = currentDate.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day; // Adjust when day is Sunday
    currentDate.setUTCDate(currentDate.getUTCDate() + diff);
  
    while (currentDate <= endDate) {
      weeks.push(formatDate(currentDate));
      currentDate.setUTCDate(currentDate.getUTCDate() + 7);
    }
  
    return weeks;
  }
  
  // -------------------
  // Helper Function: Format Date
  // -------------------
  function formatDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // -------------------
  // Function: Filter Ad Data
  // -------------------
  function filterAdData(adMappingsToProcess = relevantAdMappings) {
    // Get the date range from the available months
    const startMonth = availableMonths[selectedMonthIndices[0]];
    const endMonth = availableMonths[selectedMonthIndices[1]];
    
    // Convert months to dates for the full range
    const startDate = new Date(`${startMonth}-01`);
    const endDate = new Date(`${endMonth}-01`);
    endDate.setMonth(endDate.getMonth() + 1); // Go to start of next month
    endDate.setDate(endDate.getDate() - 1); // Back up to end of current month
    
    // Get all weeks in the range
    const allWeeks = getAllWeeksInRange(startDate, endDate);
    
    // Create a map of weeks to ad counts using the filtered mappings
    const weekCounts = {};
    
    // Initialize all weeks with 0
    allWeeks.forEach(week => {
      weekCounts[week] = 0;
    });
    
    // Count ads for each week
    Object.values(adMappingsToProcess).forEach(ad => {
      try {
        if (ad.start_week && weekCounts.hasOwnProperty(ad.start_week)) {
          weekCounts[ad.start_week]++;
        }
      } catch (error) {
        console.error(`Error processing ad: ${error.message}`);
        // Optionally log or handle the error further
      }
    });
    
    // Convert to array format and sort by week
    filteredAdData = Object.entries(weekCounts)
      .map(([week_start, ad_count]) => ({
        week_start,
        ad_count
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));
  }
  
  // -------------------
  // Global Ad Mappings
  // -------------------
  const globalAdMappings = {}; // Each key will be a hash, and each value will be a Set of ad IDs
  
  // -------------------
  // Function: Collect Relevant Ads
  // -------------------
  function collectRelevantAds(startIndex, endIndex) {
    // Pre-allocate collections with estimated size
    const allAdIds = new Set();
    const filteredMappings = Object.create(null); // Faster than {}
    const monthRange = availableMonths.slice(startIndex, endIndex + 1);
    const keywordsByMonth = topKeywordsByMonth; // Cache lookup
    const mappings = adMappings; // Cache lookup
    
    // Process months in chunks
    const chunkSize = 3;
    for (let i = 0; i < monthRange.length; i += chunkSize) {
      const monthChunk = monthRange.slice(i, Math.min(i + chunkSize, monthRange.length));
      
      for (const month of monthChunk) {
        const monthData = keywordsByMonth[month];
        if (!monthData) continue;
  
        // Process keywords in chunks
        const keywordChunkSize = 100;
        for (let j = 0; j < monthData.length; j += keywordChunkSize) {
          const keywordChunk = monthData.slice(j, j + keywordChunkSize);
          
          for (const keywordData of keywordChunk) {
            const { ad_ids: adIds, hash } = keywordData;
            if (!adIds) continue;
  
            // Initialize hash set if needed
            globalAdMappings[hash] = globalAdMappings[hash] || new Set();
            const hashSet = globalAdMappings[hash];
  
            // Process ad IDs efficiently
            for (const idItem of adIds) {
              if (Array.isArray(idItem)) {
                const [start, end] = idItem;
                // Process ranges in chunks
                const rangeSize = 1000;
                for (let id = start; id <= end; id += rangeSize) {
                  const chunkEnd = Math.min(id + rangeSize, end + 1);
                  for (let adId = id; adId < chunkEnd; adId++) {
                    allAdIds.add(adId);
                    hashSet.add(adId);
                    
                    const mapping = mappings[adId];
                    if (mapping) {
                      // Avoid spread operator for performance
                      filteredMappings[adId] = Object.assign(
                        Object.create(null),
                        mapping,
                        { hash }
                      );
                    }
                  }
                }
              } else {
                allAdIds.add(idItem);
                hashSet.add(idItem);
                
                const mapping = mappings[idItem];
                if (mapping) {
                  filteredMappings[idItem] = Object.assign(
                    Object.create(null),
                    mapping,
                    { hash }
                  );
                }
              }
            }
          }
        }
      }
    }
  
    // Convert Set to Array only once at the end
    return {
      adIds: Array.from(allAdIds),
      mappings: filteredMappings
    };
  }
  
  // -------------------
  // Function: Reset Filters
  // -------------------
  function resetFilters() {
    selectedTopic = null;
    loadFunderData(selectedFunder.id);
    wordSearchTerm = '';
    mappingsFilteredByKeyword = {};
    selectedMonthIndices = [0, availableMonths.length - 1];
    sliderValue = [0, availableMonths.length - 1];
  }
  
  // -------------------
  // Reactive Statement: Update on Month Indices Change
  // -------------------
  $: if (selectedMonthIndices && !isLoading && selectedMonthIndices.length === 2) {
    const [currentStart, currentEnd] = selectedMonthIndices;
    const [prevStart, prevEnd] = previousSelectedMonthIndices;
  
    if (currentStart !== prevStart || currentEnd !== prevEnd) {
      previousSelectedMonthIndices = [...selectedMonthIndices];
      
      const { adIds, mappings } = collectRelevantAds(currentStart, currentEnd);
      relevantAdIds = adIds;
      relevantAdMappings = mappings;
  
      Promise.all([
        (async () => {
          filterAdData();
          aggregatedKeywords = aggregateKeywords(currentStart, currentEnd);
        })(),
        (async () => {
          const newTopics = await calculateTopicAffinities(relevantAdMappings);  // Pass it here
          topTopicsByMonth = newTopics;
        })()
      ]).catch(error => {
        console.error('Error updating data:', error);
      });
    }
  }
  
  // -------------------
  // Function: Update Topic Affinities
  // -------------------
  async function updateTopicAffinities(filteredMappings) {
    const newTopics = await calculateTopicAffinities(filteredMappings);
    topTopicsByMonth = newTopics; // Set the value after awaiting
  }
  
  // -------------------
  // Reactive Statement: Filter Keywords Based on Search Term
  // -------------------
  $: if (wordSearchTerm.length > 0) {
    filteredKeywords = wordSearchTerm
        ? aggregatedKeywords.filter(k => k.text.includes(wordSearchTerm.toLowerCase()))
        : aggregatedKeywords;
      
  
    const filteredHashes = new Set(filteredKeywords.map(k => k.hash));
  
  
    let filteredIds = new Set();
  
    // globalAdMappings has hash as key and a Set of ad IDs as value
    for (const [hash, adIdsSet] of Object.entries(globalAdMappings)) {
      if (filteredHashes.has(hash)) {
        for (const adId of adIdsSet) {
          filteredIds.add(adId);
        }
      }
    }
  
    // relevantAdMappings is an object with adID as key and then the data is an object. We need to filter this object based on the filteredIds
  
    mappingsFilteredByKeyword = {};
  
    for (const adId of filteredIds) {
      if (relevantAdMappings[adId]) {
        mappingsFilteredByKeyword[adId] = relevantAdMappings[adId];
      }
    }
  
    filterAdData(mappingsFilteredByKeyword);
  
    // Call the async function to calculate topic affinities
    updateTopicAffinities(mappingsFilteredByKeyword);
  
  } else {
    filteredKeywords = aggregatedKeywords;
    mappingsFilteredByKeyword = {}
    filterAdData(relevantAdMappings)
    updateTopicAffinities(relevantAdMappings);
  }
  
  // -------------------
  // Reactive Statement: Handle Slider Value Changes with Debounce
  // -------------------
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
    }, 500); // Increased debounce time for better performance
  }
  
  // -------------------
  // Function: Handle Topic Selection
  // -------------------
  function handleSelectTopic(event) {
    const { topic } = event.detail;
    selectedTopic = topic;
    loadFunderData(selectedFunder.id);
  }
  
  // -------------------
  // onMount Lifecycle Hook
  // -------------------
  onMount(async () => {
    // Fetch 'funder_counts.json' on mount
    await loadFunders();
  
    // Select the default funder
    selectFunder({'name': 'Conservative Party of Canada - Parti conservateur du Canada', 'id': '67'});
  
    if (typeof window !== 'undefined') {
      updateWidth();
      window.addEventListener('resize', updateWidth);
    }
  });
  
  // -------------------
  // Function: Update Width and Height Based on Window Size
  // -------------------
  function updateWidth() {
    width = window.innerWidth * 0.37;
    height = window.innerHeight * 0.15;
  }
  
  // -------------------
  // onDestroy Lifecycle Hook
  // -------------------
  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateWidth);
    }
  });
  
  // -------------------
  // Reactive Statement: Compute Funders for SidebarList
  // -------------------
  let computedFunders = [];

  
  $: {
    if (selectedDataSource === "By Complete Library") {
      // Use similar funders or keyword-based funders
      const mappingsToUse = Object.keys(mappingsFilteredByKeyword).length > 0 ? mappingsFilteredByKeyword : relevantAdMappings;
      
      // Aggregate counts of each funder_id
      const funderCounts = {};
      for (const adId in mappingsToUse) {
        const ad = mappingsToUse[adId];
        const funderId = ad.funder_id;
        if (funderId) {
          funderCounts[funderId] = (funderCounts[funderId] || 0) + 1;
        }
      }
      
      // Find the maximum count for normalization
      const counts = Object.values(funderCounts);
      const maxCount = counts.length > 0 ? Math.max(...counts) : 1; // Avoid division by zero
      
      // Create the libraryFunders array using the new object structure
      const libraryFunders = Object.entries(funderCounts).map(([funder_id, count]) => {
        const funder = funders[funder_id]; // Access funder directly by ID
        return {
          funder_id: funder_id,
          funder_name: funder ? funder.funder_name : "Unknown", // Use 'funder_name' instead of 'name'
          similarity_score: count / maxCount // Normalized similarity score between 0 and 1
        };
      }).sort((a, b) => b.similarity_score - a.similarity_score); // Optional: sort by similarity_score
      
      computedFunders = libraryFunders;

    } else {
      // Use similar funders when not "By Complete Library"
      computedFunders = funderMatches;
    }
  }
  
</script>

<div class="main-container" in:fade>
  <Sidebar>
    {#if (selectedDataSource === "By Funder" && (funderMatches.length > 0 || searchTerm.length > 0)) || 
         (selectedDataSource === "By Complete Library" && computedFunders.length > 0)}
      <SidebarList 
        funderMatches={computedFunders} 
        searchTerm={searchTerm} 
        suggestions={suggestions} 
        selectFunder={selectFunder} 
        sortedFunders={sortedFunders}
        selectedDataSource={selectedDataSource}
      />
    {/if}
  </Sidebar>

  <div class='header'>
    <h2>
      {#if selectedDataSource == "By Complete Library"}
        Complete Ad Library
      {:else if selectedDataSource == "By Funder"}
        {#if selectedFunder}
          {selectedFunder.name}
        {/if}
      {:else if selectedDataSource == "By Page"}
        By Page
      {/if}
    </h2>
    

    <div class="button-group">
      <DownloadButton {mappingsFilteredByKeyword} {relevantAdMappings} />
      <button on:click={resetFilters}>Reset Filters</button>
    </div>
  </div>

  <div class="active-filters">
    <span class="filter-title">Active Filters:</span>

    {#if selectedMonthIndices.length === 2}
      <span class="filter-item">
        {availableMonths[selectedMonthIndices[0]]} - {availableMonths[selectedMonthIndices[1]]}
      </span>
    {/if}

    {#if selectedTopic}
      <span class="filter-item">
        <span class="filter-label">Topic:</span> <span class="filter-value">{selectedTopic.replace(/-/g, ' ')}</span>
      </span>
    {/if}

    {#if wordSearchTerm}
      <span class="filter-item">
        <span class="filter-label">Keyword:</span> <span class="filter-value">{wordSearchTerm}</span>
      </span>
    {/if}

    <div class="dropdown">
      <select id="dataSource" bind:value={selectedDataSource} on:change={() => loadFunderData(selectedFunder.id)}>
        <option>By Complete Library</option>
        <option>By Funder</option>
        <option>By Page</option>
      </select>
    </div>
  </div>
    
  <div class="barchart-container" style="min-height: {height + 40}px; max-height: 30vh;">
    <h3>Number of Ads Launched by Week</h3>
    <BarChart 
      data={filteredAdData} 
      width={900} 
      height={height} 
      marginTop={5} 
      marginRight={20} 
      marginBottom={50} 
      marginLeft={60}
    />
    <div class="slider-container">
      <Slider
        min={0}
        max={availableMonths.length - 1}
        step={1}
        bind:value={sliderValue}
      />
    </div>
  </div>

  <!-- Bottom Row: Word Cloud and Topics -->
  <div class="bottom-row">
    <Wordcloud 
      {words} 
      bind:wordSearchTerm
      {width} 
      {height} 
      {availableMonths} 
      {selectedMonthIndices} 
      {selectedFunder} 
      {topKeywordsByMonth} 
      {aggregatedKeywords}
      {filteredKeywords}
    />
    <Topics 
      {topTopicsByMonth} 
      {availableMonths} 
      {selectedMonthIndices} 
      {selectedFunder}
      selectedTopic={selectedTopic}
      on:selectTopic={handleSelectTopic}
    />
  </div>
</div>

<style>
  /* -------------------
     General Styles
  ------------------- */
  .main-container {
    display: grid;
    grid-template-rows: auto auto 1fr;
    grid-gap: 1rem;
    padding: 2rem;
    margin-left: 22%; /* To account for the sidebar width */
    /* Adjust margin-left based on sidebar width if necessary */
  }

  /* -------------------
     Header Styles
  ------------------- */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 100%;
  }

  .header button {
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

  .header button:hover {
    background-color: rgb(63, 59, 59);
    color: #f8f8f8;
  }

  .header > h2 {
    color: rgb(207, 201, 201);
    font-size: 1.5rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-weight: 700;
    max-width: 40vw;
  }

  /* -------------------
     Dropdown Styles
  ------------------- */
  .dropdown {
    margin-left: auto;
    cursor: pointer;
  }


  .dropdown select {
    white-space: nowrap;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    font-weight: 700;
    border: 1px solid #4c6669;
    color: #c3c3c3;
    font-size: 0.85rem;
    appearance: none;
    background: none;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px;
    transition: 0.3s background-color, 0.3s color;
    cursor: pointer;
  }

  .dropdown select option {
    background-color: #34495e;
    color: #ecf0f1;
  }

  /* -------------------
     Slider Container Styles
  ------------------- */
  .slider-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-left: 3rem;
    margin-right: 3rem;
    min-height: 0.4rem;
  }

  /* -------------------
     Bottom Row Styles
  ------------------- */
  .bottom-row {
    display: grid;
    grid-template-columns: 2fr 1fr; /* Adjusted to accommodate the bar chart */
    grid-gap: 2rem;
    align-items: start;
    margin-top: 2rem;
    position: relative; /* Changed from absolute to relative for better layout control */
  }

  /* -------------------
     Bar Chart Container Styles
  ------------------- */
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

  /* -------------------
     Active Filters Styles
  ------------------- */
  .active-filters {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    font-size: 0.9rem;
  }

  .active-filters span {
    margin-right: 0.5rem;
  }

  .active-filters {
    color: white;
    font-weight: 400;
  }

  .filter-title {
    font-weight: 700;
    margin-right: 8px;
  }

  .filter-item {
    margin-right: 12px;
  }

  .filter-label {
    font-weight: 600;
    margin-right: 4px;
    color: #f1c40f; /* Optional: adds a distinct color to labels like "Topic" or "Keyword" */
  }

  .filter-value {
    font-weight: 400;
    color: #ecf0f1; /* Optional: softer color for values to distinguish from labels */
  }

  /* -------------------
     Responsive Styles
  ------------------- */
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