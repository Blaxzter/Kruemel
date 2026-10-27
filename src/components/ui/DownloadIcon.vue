<script setup lang="ts">
/** Arrow into a tray: install the app, save a backup. Decorative, the button carries the name. */
withDefaults(defineProps<{ size?: number }>(), { size: 22 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </svg>
</template>
