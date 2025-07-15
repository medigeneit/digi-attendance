<template>
  <div class="card-bg p-8 w-full flex flex-col items-center space-y-2">
    <div class="relative w-12 h-12">
      <div class="absolute inset-0 w-full h-full border-4 border-x-gray-200 rounded-full"></div>
      <div
        class="absolute inset-0 w-full h-full border-4 border-t-transparent border-b-transparent border-l-blue-600 rounded-full animate-spin"
      ></div>
    </div>
    <span class="text-blue-600 text-sm"><slot>Loading...</slot></span>
  </div>
</template>
