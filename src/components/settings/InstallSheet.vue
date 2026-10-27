<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import InstallGuide from '@/components/intro/InstallGuide.vue'
import InstallButton from '@/components/ui/InstallButton.vue'
import { useInstallPrompt } from '@/pwa/useInstallPrompt'

/**
 * "App installieren" from the settings: the browser's install button when it offers one,
 * otherwise the manual steps for this browser. Closes once the app is installed.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { install, mode } = useInstallPrompt()

watch(mode, (now) => {
  if (now === 'installed') emit('close')
})

async function onInstall(): Promise<void> {
  if ((await install()) === 'accepted') emit('close')
}
</script>

<template>
  <BottomSheet :open="open" :title="t('intro.install.title')" :description="t('intro.install.text')" @close="emit('close')">
    <div class="install-sheet">
      <InstallButton v-if="mode === 'prompt'" @click="onInstall" />
      <InstallGuide v-else-if="mode !== 'installed'" :guide="mode" />
    </div>
  </BottomSheet>
</template>

<style scoped>
.install-sheet {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
