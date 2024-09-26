<script>
	import '../app.css';
	import background from '$lib/background.png';
</script>

<div class="container" style="background-image: url({background});">
	<div class="overlay"></div>

	<div class="wrapper">
		<div class="main-container">
			<slot></slot>
		</div>
	</div>
</div>

<style>
	.container {
		width: 100vw;
		height: 100vh;
        max-width: 100vw;
		background-size: cover;
		position: relative;
        padding-left: 0rem;
        padding-right: 0rem;
	}

	.wrapper {
		height: 100%;
		width: 100%;
		padding: 3rem;
		position: relative;
	}

	.main-container {
		width: 100%;
		height: 100%;
		background-color: rgba(45, 55, 55, 0.843);
		position: relative;
		border-radius: 40px;
		overflow: hidden;
	}

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(255, 254, 246, 0.241);
	}
</style>
