<script>
  import {
    scaleBand,
    scaleLinear,
    max,
    min,
    timeWeek,
    rollups
  } from 'd3';
  import { createEventDispatcher, onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';

  export let data = [];
  export let width = 800;
  export let height = 500;
  export let marginTop = 40;
  export let marginRight = 20;
  export let marginBottom = 60;
  export let marginLeft = 60;
  export let maxBars = 100; // New prop for maximum bars

  const dispatch = createEventDispatcher();
  let hoveredBar = null;

  // Animated scale for the entire chart
  const animatedScale = tweened(0, {
    duration: 300,
    easing: cubicOut
  });

  // Function to fill missing weeks
  function fillMissingWeeks(data) {
    if (data.length === 0) return [];

    // Sort data by week_start
    const sorted = data.slice().sort((a, b) => new Date(a.week_start) - new Date(b.week_start));

    const start = timeWeek.floor(new Date(sorted[0].week_start));
    const end = timeWeek.ceil(new Date(sorted[sorted.length - 1].week_start));

    // Generate all weeks in the range
    const allWeeks = timeWeek.range(start, end, 1);

    // Create a map for existing data
    const dataMap = new Map(
      sorted.map(d => [timeWeek.floor(new Date(d.week_start)).getTime(), d.ad_count])
    );

    // Merge data with all weeks, filling missing weeks with ad_count = 0
    const completeData = allWeeks.map(week => {
      const time = week.getTime();
      return {
        week_start: week.toISOString().split('T')[0], // 'YYYY-MM-DD'
        ad_count: dataMap.get(time) || 0
      };
    });

    return completeData;
  }

  // Reactive statement to fill missing weeks
  $: sortedData = fillMissingWeeks(data);

  // Sampling the data if it exceeds maxBars
  $: sampledData = sortedData.length > maxBars
    ? sortedData.filter((_, index) => index % Math.ceil(sortedData.length / maxBars) === 0)
    : sortedData;

  // Define xDomain based on sampledData
  $: xDomain = sampledData.map(d => d.week_start);

  // Define scales using scaleBand for consistent positioning
  $: x = scaleBand()
    .domain(xDomain)
    .range([marginLeft, width - marginRight])
    .padding(0.1);

  // Define yScale
  $: yExtent = [min(sampledData, d => d.ad_count), max(sampledData, d => d.ad_count)];
  $: y = scaleLinear()
    .domain([yExtent[0] < 0 ? yExtent[0] : 0, yExtent[1]])
    .nice()
    .range([height - marginBottom, marginTop]);

  // Define the desired number of x-axis ticks
  const desiredTickCount = 10;

  // Reactive statement to generate xTicks from sampledData
  $: xTicks = sampledData.length > desiredTickCount
    ? sampledData.filter((_, index) => index % Math.ceil(sampledData.length / desiredTickCount) === 0).map(d => d.week_start)
    : sampledData.map(d => d.week_start);

  $: yTicks = y.ticks(5);

  // Start animation on mount and data change
  onMount(() => {
    animatedScale.set(1);
  });

  // Restart animation whenever sampledData changes
  $: {
    animatedScale.set(0);
    animatedScale.set(1);
  }

  // Formatting functions
  const formatDate = (date, includeDay = false) => {
    const options = {
      year: 'numeric',
      month: 'short',
      day: includeDay ? 'numeric' : undefined
    };
    return date.toLocaleString('default', options);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', { 
      notation: 'compact',
      compactDisplay: 'short'
    }).format(num);
  };

  // Tooltip position calculation
  function getTooltipTransform(d, index) {
    const xPos = x(d.week_start) + x.bandwidth() / 2;
    const yPos = y(d.ad_count) - 10;
    
    // Adjust x position if tooltip would extend beyond the right edge
    const adjustedX = Math.min(xPos, width - marginRight - 60);
    
    // Adjust y position if tooltip would extend beyond the top edge
    const adjustedY = Math.max(yPos, marginTop + 40);
    
    return `translate(${adjustedX}, ${adjustedY})`;
  }
</script>

<div class="chart-container">
  <svg
    {width}
    {height}
    viewBox={`0 0 ${width} ${height}`}
    style="max-width: 100%; height: auto;"
    {...$$restProps}
  >
    <g>
      {#each sampledData as d, i (d.week_start)}
        {@const fullHeight = Math.abs(y(d.ad_count) - y(0))}
        {@const fullY = d.ad_count >= 0 ? y(d.ad_count) : y(0)}
        <rect
          x={x(d.week_start)}
          y={d.ad_count >= 0 ? fullY + (1 - $animatedScale) * fullHeight : fullY}
          height={Math.max(fullHeight * $animatedScale, 2)} 
          width={x.bandwidth()}
          fill={hoveredBar === i ? "#e0d24c" : "#948c87"}
          on:mouseover={() => {
        hoveredBar = i;
        dispatch('barHover', d);
          }}
          on:mouseout={() => {
        hoveredBar = null;
        dispatch('barOut');
          }}
          class="bar"
        />
    {/each}
    </g>

    <!-- X Axis -->
    <g transform={`translate(0,${height - marginBottom + 1})`}>
      <line x1={marginLeft} x2={width - marginRight} stroke="#666" />
      {#each xTicks as tick (tick)}
        <g transform={`translate(${x(tick)},0)`}>
          <line y2="6" stroke="#666" />
          <text
            y="9"
            dy="0.71em"
            text-anchor="middle"
            fill="#666"
            font-size="12"
          >
            {formatDate(new Date(tick), true)}
          </text>
        </g>
      {/each}
    </g>
  

    <!-- Tooltip -->
    <g
      transform={hoveredBar !== null ? getTooltipTransform(sampledData[hoveredBar], hoveredBar) : `translate(0,0)`}
      class="tooltip-group"
      style={`visibility: ${hoveredBar !== null ? 'visible' : 'hidden'};`}
    >
      {#if hoveredBar !== null}
        {@const d = sampledData[hoveredBar]}
        <rect
          x="-60"
          y="-40"
          width="120"
          height="60"
          fill="#393E40"
          stroke="#ccc"
          opacity="0.9"
          rx="5"
          ry="5"
          in:fly={{ y: -2, duration: 300, easing: cubicOut }}
          out:fly={{ y: 10, duration: 200, easing: cubicOut }}
        />
        <text class="tooltip" text-anchor="middle" font-size="12" dy="-20">
          {formatDate(new Date(d.week_start), true)}
        </text>
        <text class="tooltip" text-anchor="middle" font-size="14" dy="5" font-weight="bold">
          {formatNumber(d.ad_count)} ads
        </text>
      {/if}
    </g>
  </svg>
</div>

<style>
  .chart-container {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    position: relative;
  }

  /* CSS Transitions for Bars */
  .bar {
    transition: y 0.8s cubic-bezier(0.25, 0.1, 0.25, 1), height 0.8s cubic-bezier(0.25, 0.1, 0.25, 1);
    will-change: height, y;
    cursor: pointer; /* Indicate interactivity */
  }

  .bar {
  transition: fill 0.3s ease-in-out;
}

  text {
    fill: #ccc;
  }

  line {
    stroke: #ccc;
  }

  .tooltip-group {
    pointer-events: none; /* Prevent tooltip from capturing mouse events */
    transition: opacity 0.3s ease;
    opacity: 0;
  }

  .tooltip-group[style*="visibility: visible"] {
    opacity: 1;
  }

  .tooltip {
    fill: #ccc !important;
    pointer-events: none; /* Ensure text doesn't capture mouse events */
  }
</style>
