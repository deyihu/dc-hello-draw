<script setup>

</script>
<template>
  <!-- <h1>Hello Cesium Draw!</h1> -->

  <nav class="flex menu-nav">
    <RouterLink to="/draw">绘制页面</RouterLink><br>
    <RouterLink to="/fly">飞行页面</RouterLink>
  </nav>
  <div class="main">
    <RouterView />
  </div>
</template>

<style scoped>

</style>
