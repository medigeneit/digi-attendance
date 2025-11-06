<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'AdminCareersJobs' }" class="main-button">
     <i class="fas fa-sliders-h text-3xl"></i>
      Job Circulars 
    </RouterLink>
    <RouterLink :to="{ name: 'AdminCareersApplications' }" class="main-button">
     <i class="far fa-briefcase text-3xl"></i>
      Applications
    </RouterLink>
  </div>
</template>
