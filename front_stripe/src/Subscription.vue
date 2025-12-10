<template>
  <div>
    <button @click="getSubscriptions">获取订阅列表</button>
  </div>
</template>

<script setup>
  const getSubscriptions = async () => {
    const response = await fetch('http://localhost:3000/subscriptions/all')
    // const data = await response.json()
    // console.log(data)
  }

</script>

<style scoped>
button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
</style>