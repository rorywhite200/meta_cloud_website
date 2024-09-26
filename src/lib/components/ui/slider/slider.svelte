<script lang="ts">
	import { Slider as SliderPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	type $$Props = SliderPrimitive.Props;

	let className: $$Props["class"] = undefined;
	export let value: $$Props["value"] = [0];
	export { className as class };
</script>

<SliderPrimitive.Root
	bind:value
	class={cn("relative flex w-full touch-none select-none items-center", className)}
	{...$$restProps}
	let:thumbs
>
<span class="bg-[#948c87] relative h-1 w-full grow overflow-hidden rounded-full">
		<SliderPrimitive.Range class="bg-[#e0d24c] absolute h-full" />
	</span>
	{#each thumbs as thumb, index}

		<SliderPrimitive.Thumb
			{thumb}
			class="bg-[#e0d24c] block h-3 w-3 rounded-full focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-20 active:border-2 hover:border-2 cursor-pointer "
		/>
	{/each}

</SliderPrimitive.Root>

