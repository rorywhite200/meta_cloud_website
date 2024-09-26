


<script>
    import { onMount } from "svelte";

    
    export let topTopicsByMonth = {};
    export let availableMonths = [];
    export let selectedMonthIndices = [0, 0];
    export let selectedFunder = null;

    let aggregatedTopics = [];

    onMount(() => {
      aggregateAndGenerateTopics();
    });

    $: if (selectedMonthIndices || selectedFunder) {
      aggregateAndGenerateTopics();
    }

    // Function to aggregate and normalize topics
    function aggregateAndGenerateTopics() {
      if (!topTopicsByMonth) return;
    
      const [startIndex, endIndex] = selectedMonthIndices;
      if (startIndex < 0 || endIndex >= availableMonths.length || startIndex > endIndex) {
        aggregatedTopics = [];
        return;
      }
    
      const numMonths = endIndex - startIndex + 1;
      const aggregated = {};
    
      for (let i = startIndex; i <= endIndex; i++) {
        const month = availableMonths[i];
        const monthData = topTopicsByMonth[month];
        if (!monthData) continue;
        const topics = monthData.topics || [];
        topics.forEach(({ topic, weighted_count, normalized_intensity }) => {
          if (aggregated[topic]) {
            aggregated[topic].normalized_intensity += normalized_intensity;
          } else {
            aggregated[topic] = {
              topic,
              normalized_intensity: normalized_intensity
            };
          }
        });
      }
    
      // Calculate the average normalized_intensity per topic
      aggregatedTopics = Object.values(aggregated).map(topicData => {
        return {
          topic: topicData.topic,
          // Average the normalized_intensity
          normalized_intensity: ((topicData.normalized_intensity / numMonths) || 0).toFixed(2)
        };
      });
    
      // Sort topics by normalized_intensity descending
      aggregatedTopics.sort((a, b) => b.normalized_intensity - a.normalized_intensity);
    }
</script>

<div class="topics-container">
    <h3>Topics</h3>
    {#if aggregatedTopics.length > 0}
    {#each aggregatedTopics as topic}
      <div class="topic">
        <span style="opacity: {0.60 + (topic.normalized_intensity /50)}" class="topic-name">{topic.topic.replace(/-/g, ' ')}</span>
        <div class="progress-bar">
          <div
            class="progress"
            style="width: {30 + (topic.normalized_intensity /0.9) }%; opacity: {0.2 + (topic.normalized_intensity /50)}"
            
          ></div>
        </div>
      </div>
    {/each}
    {/if}
  </div>

  <style>
      /* Topics Container */
  .topics-container {
    display: flex;
    flex-direction: column;
    border: 1px solid rgb(141, 255, 92);
    border-radius: 20px;
    background-color: rgb(51, 51, 51);
    padding: 1rem 2rem;
    box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, 
                rgba(0, 0, 0, 0.12) 0px -12px 30px, 
                rgba(0, 0, 0, 0.12) 0px 4px 6px, 
                rgba(0, 0, 0, 0.17) 0px 12px 13px, 
                rgba(0, 0, 0, 0.09) 0px -3px 5px;
    overflow-y: auto;
    max-height: 31vh;
    min-height: 31vh;
  }

  .topics-container h3 {
    color: rgb(236, 236, 236);
    margin: 0;
    margin-bottom: 1rem;
  }

  .topic {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .topic-name {
    flex: 1;
    font-size: 0.80rem;
    color: rgb(236, 236, 236);
    font-weight: 700;
    cursor: pointer;
  }

  .progress-bar {
    background-color: #6b6b6b;
    border-radius: 10px;
    overflow: hidden;
    height: 7px;
    margin: 0 1rem;
    width: 40%;
  }

  .progress {
    height: 100%;
    background-color: rgb(141, 255, 92);
    transition: width 0.3s ease;
    min-width: 50%;

  }
  </style>