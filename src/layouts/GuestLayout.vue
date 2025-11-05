<script setup>
import { RouterView } from 'vue-router'
import FooterMain from '@/components/layouts/FooterMain.vue'
import HeaderPublic from '@/components/layouts/HeaderPublic.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col justify-between">
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
