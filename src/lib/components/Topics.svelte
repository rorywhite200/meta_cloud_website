<script>
    import { createEventDispatcher, tick } from 'svelte';
    const dispatch = createEventDispatcher();
    
    export let selectedTopic = null;
    export let topTopicsByMonth = null;
    
    let aggregatedTopics = [];
    let isCalculating = false;
    let sortField = 'count';
    let sortDirection = 'desc';
    let topicsContainer;
    
    $: if (topTopicsByMonth) {
        processTopics(topTopicsByMonth);
    }
    
    $: sortedTopics = [...aggregatedTopics].sort((a, b) => {
        const multiplier = sortDirection === 'asc' ? 1 : -1;
        if (sortField === 'normalized_intensity' || sortField === 'count') {
            return multiplier * (parseFloat(a[sortField]) - parseFloat(b[sortField]));
        }
        return multiplier * a[sortField].localeCompare(b[sortField]);
    });
    
    function handleSort(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'desc';
        }
    }
    
    async function handleTopicSelect(originalTopic) {
        const newSelection = originalTopic === selectedTopic ? null : originalTopic;
        dispatch('selectTopic', { topic: newSelection });
        
        // Wait for any content updates to complete
        await tick();
        sortField = 'count';
        sortDirection = 'desc';
        if (topicsContainer) {
            // Force immediate scroll to top first to ensure it works
            topicsContainer.scrollTop = 0;
            // Then apply smooth scroll for any subsequent scrolling
            requestAnimationFrame(() => {
                topicsContainer.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }
    
    function processTopics(topics) {
        if (!Array.isArray(topics)) {
            console.warn('Topics is not an array:', topics);
            aggregatedTopics = [];
            return;
        }
    
        aggregatedTopics = topics
            .filter(topic => topic && topic.topic && typeof topic.score === 'number')
            .map(topic => ({
                originalTopic: topic.topic,  // Keep original topic name for selection
                displayTopic: topic.topic.replace(/-/g, ' '),  // Modified topic name for display
                count: topic.count || 0,
                normalized_intensity: topic.score || 0
            }));
    }
    </script>
    

    <div class="table-container" bind:this={topicsContainer}>
        <table>
            <thead>
                <tr>
                    <th on:click={() => handleSort('displayTopic')}>
                        Topic 
                        <span class="sort-indicator">
                            {#if sortField === 'displayTopic'}
                                {sortDirection === 'asc' ? '↑' : '↓'}
                            {:else}
                                <span class="invisible">↓</span>
                            {/if}
                        </span>
                    </th>
                    <th on:click={() => handleSort('count')}>
                        Ads
                        <span class="sort-indicator">
                            {#if sortField === 'count'}
                                {sortDirection === 'asc' ? '↑' : '↓'}
                            {:else}
                                <span class="invisible">↓</span>
                            {/if}
                        </span>
                    </th>
                    <th on:click={() => handleSort('normalized_intensity')}>
                        Intensity
                        <span class="sort-indicator">
                            {#if sortField === 'normalized_intensity'}
                                {sortDirection === 'asc' ? '↑' : '↓'}
                            {:else}
                                <span class="invisible">↓</span>
                            {/if}
                        </span>
                    </th>
                </tr>
            </thead>
            <tbody>
                {#if sortedTopics.length === 0}
                    <tr>
                        <td colspan="3" class="empty-state">
                            {isCalculating ? 'Calculating...' : 'No topics'}
                        </td>
                    </tr>
                {:else}
                    {#each sortedTopics as { originalTopic, displayTopic, count, normalized_intensity }}
                        <tr 
                            class:selected={originalTopic === selectedTopic}
                            on:click={() => handleTopicSelect(originalTopic)}
                        >
                            <td>{displayTopic}</td>
                            <td>{count}</td>
                            <td>{normalized_intensity.toFixed(1)}</td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
    
    <style>
        .table-container {
            border: 1px solid rgb(141, 255, 92);
            border-radius: 20px;
            background-color: rgb(51, 51, 51);
            padding: 0.5rem;
            box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px,
                        rgba(0, 0, 0, 0.12) 0px -12px 30px,
                        rgba(0, 0, 0, 0.12) 0px 4px 6px,
                        rgba(0, 0, 0, 0.17) 0px 12px 13px,
                        rgba(0, 0, 0, 0.09) 0px -3px 5px;
            max-height: 31vh;
            min-height: 31vh;
            min-width: 20vw;
            overflow-y: scroll; /* Always show vertical scrollbar */
            scrollbar-gutter: stable; /* Reserve space for scrollbar */
        }
    
        table {
            width: 100%;
            table-layout: fixed; /* Use fixed table layout */
            border-collapse: collapse;
            color: rgb(236, 236, 236);
            font-size: 0.75rem;
        }
    
        /* Set specific widths for each column */
        th:first-child {
            width: 38%; /* Topic column gets more space */
        }
        
        th {
            text-align: left;
            padding: 0.25rem 0.5rem;
            cursor: pointer;
            user-select: none;
            font-size: 0.7rem;
            font-weight: normal;
            color: rgb(180, 180, 180);
            position: relative; /* For sort indicator positioning */
            width: 31%; /* Default width for numeric columns */
        }
    
        .sort-indicator {
            display: inline-block;
            width: 1em; /* Fixed width for sort indicator */
            margin-left: 0.25rem;
        }
    
        .invisible {
            opacity: 0;
        }
    
        th:hover {
            background-color: rgba(236, 236, 236, 0.1);
        }
    
        td {
            padding: 0.25rem 0.5rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    
        tr {
            border-bottom: 1px solid rgba(141, 255, 92, 0.2);
            cursor: pointer;
        }
    
        tr:last-child {
            border-bottom: none;
        }
    
        tr:hover {
            background-color: rgba(236, 236, 236, 0.036);
        }
    
        tr.selected {
            background-color: rgba(236, 236, 236, 0.225);
            border: 1px solid rgb(141, 255, 92);
        }
    
        .empty-state {
            text-align: center;
            padding: 1rem;
            color: rgb(180, 180, 180);
            font-size: 0.7rem;
        }
    </style>