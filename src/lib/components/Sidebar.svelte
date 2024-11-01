<script>
    import logo from '$lib/logo.png';

    function refreshPage() {
  window.location.reload(); // Refresh the page
}
</script>

<div class="sidebar">


  <div on:click={refreshPage} style="cursor: pointer;">
    <img src={logo} alt="logo" class="logo" />
  </div>
    <slot />
</div>

<style>
    .sidebar {
      position: fixed;
      width: 100%;
      bottom: 0;
      border-radius: 0;
      white-space: nowrap;
      width: 20%;
    padding: 1.5rem;
    background-color: rgb(57, 62, 64);
    position: absolute;
    left: 0;
    top: 0;
    box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, 
                rgba(0, 0, 0, 0.12) 0px -12px 30px, 
                rgba(0, 0, 0, 0.12) 0px 4px 6px, 
                rgba(0, 0, 0, 0.17) 0px 12px 13px, 
                rgba(0, 0, 0, 0.09) 0px -3px 5px;
    border-bottom-left-radius: 20px;
    overflow: hidden;
    height: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    }

    .sidebar .logo {
      margin-bottom: 0;
      padding: 0.5rem;
      width: 100%;
    padding: 1rem;
    margin-bottom: 2rem;
    }


</style>