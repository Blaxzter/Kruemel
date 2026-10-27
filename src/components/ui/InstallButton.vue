<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DownloadIcon from './DownloadIcon.vue'

/** "App installieren": the big accent pill shown when the browser offers its install prompt. */
const emit = defineEmits<{ click: [] }>()

const { t } = useI18n()
</script>

<template>
  <button type="button" class="install-button" data-testid="install-button" @click="emit('click')">
    <DownloadIcon />
    <span>{{ t('intro.install.button') }}</span>
  </button>
</template>

<style scoped>
.install-button {
  height: 56px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font: 800 17px var(--font-body);
}
</style>
