<script setup>
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="bg-blue-200">
    <div class="my-container mx-auto">
      <div class="py-8">
        <div class="grid md:grid-cols-4 grid-cols-1 gap-4 md:gap-10 max-w-6xl">
          <div class="flex flex-col justify-center gap-4 items-center md:items-start px-2">
            <div class="flex items-start gap-2">
              <div class="text-3xl font-semibold">ঠিকানা</div>
            </div>
            <div class="flex">
              <i class="far fa-map-marker-alt pr-2"></i>
              Dhaka
            </div>
          </div>

          <hr class="md:hidden" />

          <div class="flex flex-col items-center md:items-start gap-2">
            <h4 class="title-md">Link</h4>
            <RouterLink to="/" class="hover:underline">Home</RouterLink>
            <RouterLink to="/about" class="hover:underline">About</RouterLink>
          </div>

          <hr class="md:hidden" />
          <div class="flex flex-col items-center gap-2 md:items-start">
            <h4 class="title-md">Contact</h4>

            <a href="tel:01712260211" target="_blank" class="flex items-center">
              <i class="fas fa-phone-alt pr-2"></i>
              <p>01712-260211</p>
            </a>
            <a href="mailto:medigeneit@gmail.com" target="_blank" class="flex items-center">
              <i class="far fa-envelope pr-2"></i>
              <p>medigeneit@gmail.com</p>
            </a>
          </div>

          <hr class="md:hidden" />

          <div class="flex flex-col md:items-start items-center text-center md:text-right gap-2">
            <h4 class="title-md">Social Media</h4>

            <div class="flex space-x-4">
              <a href="https://www.facebook.com" target="_blank" class="">
                <i class="fab fa-facebook"></i>
              </a>
              <a href="https://www.youtube.com" target="_blank" class="">
                <i class="fab fa-youtube"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-blue-900 py-3 flex justify-center">
      <div
        class="grid md:grid-cols-3 justify-center container mx-auto text-white md:divide-x-2 max-w-6xl"
      >
        <p class="text-center">© {{ currentYear }} medigneit.com</p>
        <p class="text-center">
          Developed by
          <strong><a href="https://medigneit.com" target="_blank">MedigneIT</a></strong>
        </p>
        <a href="tel:+8801302685282" class="text-center"
          >Helpline: <strong>01345 678 910</strong></a
        >
      </div>
    </div>
  </footer>
</template>
