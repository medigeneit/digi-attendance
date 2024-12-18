<script setup>
import { RouterView } from 'vue-router'
import FooterMain from '@/components/layouts/FooterMain.vue'
import HeaderPublic from '@/components/layouts/HeaderPublic.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col justify-between">
    <div class="bg-blue-700 py-1">
      <div class="my-container flex justify-between text-white">
        <p>123456</p>
        <p>123456</p>
      </div>
    </div>
    <header class="sticky top-0 z-[50] bg-white print:hidden">
      <HeaderPublic />
    </header>

    <main class="flex-grow pb-10">
      <RouterView />
    </main>
    <footer class="print:hidden">
      <FooterMain />
    </footer>
  </div>
</template>
