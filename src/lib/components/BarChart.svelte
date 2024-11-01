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

  export let data = [];
  export let width = 700;
  export let height = 300;
  export let marginTop = 40;
  export let marginRight = 20;
  export let marginBottom = 60;
  export let marginLeft = 60;
  export let maxBars = 100;

  const dispatch = createEventDispatcher();
  let hoveredBar = null;
  let hoveredData = null;

  const animatedScale = tweened(0, {
    duration: 300,
    easing: cubicOut
  });


  $: sortedData = data;
  $: sampledData = sortedData.length > maxBars
    ? sortedData.filter((_, index) => index % Math.ceil(sortedData.length / maxBars) === 0)
    : sortedData;

  $: xDomain = sampledData.map(d => d.week_start);
  $: x = scaleBand()
    .domain(xDomain)
    .range([marginLeft, width - marginRight])
    .padding(0.1);

  $: yExtent = [min(sampledData, d => d.ad_count), max(sampledData, d => d.ad_count)];
  $: y = scaleLinear()
    .domain([yExtent[0] < 0 ? yExtent[0] : 0, yExtent[1]])
    .nice()
    .range([height - marginBottom, marginTop]);

  const desiredTickCount = 10;
  $: xTicks = sampledData.length > desiredTickCount
    ? sampledData.filter((_, index) => index % Math.ceil(sampledData.length / desiredTickCount) === 0).map(d => d.week_start)
    : sampledData.map(d => d.week_start);

  $: yTicks = y.ticks(5);

  onMount(() => {
    animatedScale.set(1);
  });

  $: {
    animatedScale.set(0);
    animatedScale.set(1);
  }

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
</script>

<div class="chart-container">
  <svg
    {width}
    {height}
    viewBox={`0 0 ${width} ${height}`}
    style="max-width: 100%; height: auto;"
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
            hoveredData = d;
            dispatch('barHover', d);
          }}
          on:mouseout={() => {
            hoveredBar = null;
            hoveredData = null;
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
  </svg>

  <!-- Display hovered information at the top corner -->
  <div class="hover-info">
    {#if hoveredData}
      <span>Week: {formatDate(new Date(hoveredData.week_start), true)} - {formatNumber(hoveredData.ad_count)} ads</span>
    {:else}
    {/if}
  </div>
</div>

<style>
  .chart-container {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    position: relative;
    user-select: none;
  }

  .bar {
    transition: y 0.8s cubic-bezier(0.25, 0.1, 0.25, 1), height 0.8s cubic-bezier(0.25, 0.1, 0.25, 1);
    will-change: height, y;
    transition: fill 0.3s ease-in-out;
  }

  text {
    fill: #ccc;
  }

  line {
    stroke: #ccc;
  }

  /* Top corner hover info */
  .hover-info {
    position: absolute;
    top: -2.5rem;
    right: 10px;
    background-color: #393E40;
    color: rgb(225, 209, 76);
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 12px;
  }
</style>