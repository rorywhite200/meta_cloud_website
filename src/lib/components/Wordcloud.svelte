<script>
  import { scaleOrdinal, schemeSet3 } from 'd3';

  export let wordSearchTerm = '';
  export let words = [];
  export let width = 800;
  export let height = 500;
  export let availableMonths = [];
  export let selectedMonthIndices = [0, 0];
  export let selectedFunder = null;
  export let topKeywordsByMonth = {};
  export let aggregatedKeywords = null;
  export let filteredKeywords = [];
  
  const color = scaleOrdinal(schemeSet3);
  
  $: if (aggregatedKeywords || width || height || wordSearchTerm == '' || filteredKeywords) {
    generateWordCloud();
  }    

  function handleWordClick(word) {
    wordSearchTerm = word.text; // Update input with clicked word text
  }

  let d3Cloud; // Variable to hold the dynamically imported d3-cloud

  // Dynamically import d3-cloud
  import('d3-cloud').then(module => {
      d3Cloud = module.default;

    }).catch(error => {
      console.error('Failed to load d3-cloud:', error);
    });

  // Function to generate the word cloud
  function generateWordCloud() {
    if (!d3Cloud || !aggregatedKeywords) return;


    let filteredKeywordsSubset = filteredKeywords.slice(0, 100);


    const MAX_SIZE = 25;
    const MIN_SIZE = 14;
    const cloudWords = filteredKeywordsSubset.map(keyword => ({
  text: keyword.text,
  size: Math.min(
    (keyword.weighted_score / Math.max(...filteredKeywordsSubset.map(k => k.weighted_score))) * (MAX_SIZE - MIN_SIZE) + MIN_SIZE,
    MAX_SIZE
  )
}));

    const layout = d3Cloud()
      .size([width, height + (height / 3)])
      .words(cloudWords)
      .padding(3)
      .rotate(2)
      .font("Arial")
      .fontSize(d => d.size)
      .spiral("archimedean")
      .on("end", result => {
        words = result;
      });
    layout.start();
  }

  function handleMouseOver(event, size) {
    event.target.setAttribute('font-size', `${size * 1.2}px`); // Increase size by 20%
  }
  
  function handleMouseOut(event, size) {
    event.target.setAttribute('font-size', `${size}px`); // Reset to original size
  }

</script>

<div class="wordcloud-container">

  <div class="wordcloud-header">

<h3>Most Common Phrases</h3>

<!-- Search Input for Word Cloud -->
<div class="wordcloud-search-container">
  <input
    type="text"
    bind:value={wordSearchTerm}
    placeholder="Search phrases..."
    class="search-input-wordcloud"
  />
</div>

</div>

<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
  <g transform={`translate(${width / 2},${height / 2})`}>
    {#each words as word}
      <text
        font-size="{word.size}px"
        font-weight="bold"
        fill="{color(word.text)}"
        text-anchor="middle"
        transform={`translate(${word.x},${word.y})rotate(${word.rotate})`}
        on:mouseover={(event) => handleMouseOver(event, word.size)}
        on:mouseout={(event) => handleMouseOut(event, word.size)}
        style="opacity: 0.9;"
        on:click={() => handleWordClick(word)}
      >
        {word.text}
      </text>
    {/each}
  </g>
</svg>
</div>


<style>

/* Word Cloud Container */
.wordcloud-container {
  border: 1px solid #2cf2fb;
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
  max-width: 42vw;
}

  .wordcloud-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

.wordcloud-container h3 {
  color: rgb(236, 236, 236);
  margin: 0;
  margin-bottom: 1rem;
  margin-left: 1rem;
}

/* Word Cloud Search Input */
.wordcloud-search-container {
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
}

.search-input-wordcloud {
  width: 95%;
  font-family: inherit;
  padding: 0.2rem 0.5rem;
  font-size: 0.9rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  background: none;
  color: rgb(236, 236, 236);
  outline: none;
  transition: border 0.3s, box-shadow 0.3s;
  
}


.search-input-wordcloud:focus {
  border: 1px solid #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
}

/* SVG Text Styles */
.wordcloud-container svg {
  flex: 1;
}

text {
  cursor: pointer;
  transition: transform 0.3s ease, opacity 0.2s ease, font-size 0.3s ease;
  opacity: 0.8;
}


</style>