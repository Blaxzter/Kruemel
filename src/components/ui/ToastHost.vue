<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ToastAction, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from 'reka-ui'
import { useSheetStack } from '@/composables/sheetStack'
import { useToast, type Toast } from '@/composables/useToast'

/**
 * Renders the app's single toast (useToast) with Reka UI's Toast primitives: swipe right to
 * dismiss, F8 to jump to the region, and an action button that Ctrl/Cmd+Z also triggers.
 *
 * Announcing is ours: Reka 2.10/2.11 render their announcer with VisuallyHidden
 * feature="fully-hidden", i.e. aria-hidden="true", so it never reaches the accessibility tree.
 * Instead an always-mounted polite status region (visually hidden, not aria-hidden) inside the
 * layer gets "<text>. <action hint>" whenever a new toast shows. It moves into the sheet with the
 * toast, so it is announced from inside a modal sheet too.
 *
 * Known axe note: while a toast is visible, Reka's viewport renders two focus-proxy spans
 * (aria-hidden, tabindex=0) that hand Tab over into the toast and immediately move focus on.
 * axe reports them as "aria-hidden-focus"; they are Reka internals that the keyboard handoff
 * (and the sheet's focus loop onto "Rückgängig") rely on, so they are left as they are.
 *
 * Timing stays in useToast (it pauses while focused or hovered and then restarts with a full
 * duration), so Reka's own timer is switched off (duration Infinity).
 *
 * While a sheet is open the whole layer is teleported into that sheet (see sheetStack): the modal
 * Drawer hides and blocks everything outside itself, and inside it the toast is part of the
 * dialog's focus cycle and accessibility tree.
 */
withDefaults(defineProps<{ /** Distance from the bottom of the viewport, e.g. above the bottom nav. */ bottomOffset?: string }>(), {
  bottomOffset: '20px',
})

const { t } = useI18n()
const { current, runAction, dismiss, hold, release } = useToast()
const { toastAnchor } = useSheetStack()

// The visible toast plus the one that may still be animating out (a new toast replaces the old).
const items = ref<Toast[]>([])
watch(
  current,
  (toast) => {
    if (toast && !items.value.some((i) => i.id === toast.id)) items.value = [...items.value.slice(-1), toast]
  },
  { immediate: true },
)

/**
 * Reka closes a toast on swipe, on Esc and from its action/close button. The action button's
 * own click handler runs `runAction` (which also hides the toast); the close request may reach
 * us before or after that click, so it is deferred and ignored once the toast is gone.
 */
function onOpenChange(id: number, open: boolean): void {
  if (open) return
  if (ignoreEscapeClose) return
  queueMicrotask(() => dismiss(id))
}

/**
 * Reka closes every toast on any Esc press; only do that while the toast has focus. Calling
 * preventDefault() would also cancel the open sheet's own Esc handling (they share the event),
 * so the close request is ignored instead (the toast's `open` is controlled by us).
 */
let ignoreEscapeClose = false
function onEscapeKeyDown(): void {
  const active = document.activeElement
  ignoreEscapeClose = !(active instanceof Element && active.closest('.toast'))
  // Reka closes synchronously right after this event, if at all; never carry the flag further.
  queueMicrotask(() => (ignoreEscapeClose = false))
}

/**
 * Live text for screen readers. Cleared first and filled a moment later, so a toast with the same
 * text as the previous one (e.g. "Obst eingetragen" twice) is announced again.
 */
const ANNOUNCE_DELAY = 100
const announcement = ref('')
let announceTimer: ReturnType<typeof setTimeout> | undefined
watch(current, (toast, previous) => {
  if (toast?.id === previous?.id) return
  clearTimeout(announceTimer)
  announcement.value = ''
  if (!toast) return
  const text = toast.actionLabel ? `${toast.text}. ${t('common.toast.actionAlt', { action: toast.actionLabel })}` : toast.text
  // After the DOM update (the layer may just have moved into a sheet), then a short pause.
  void nextTick(() => {
    announceTimer = setTimeout(() => (announcement.value = text), ANNOUNCE_DELAY)
  })
})

function onFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget
  if (next instanceof Node && (event.currentTarget as HTMLElement).contains(next)) return
  release('focus')
}

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select'))
}

// Ctrl/Cmd+Z runs the visible toast's action (undo), so keyboard users need not tab to it in time.
function onKeydown(event: KeyboardEvent): void {
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'z') return
  if (!current.value?.actionLabel || isEditable(event.target)) return
  event.preventDefault()
  runAction()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  clearTimeout(announceTimer)
})
</script>

<template>
  <ToastProvider :label="t('common.toast.announce')" swipe-direction="right" :duration="Infinity">
    <Teleport :to="toastAnchor ?? 'body'">
      <!-- aria-live keeps this layer out of the modal sheet's aria-hidden sweep (aria-hidden spares
           live regions). "off" adds no announcements itself; the nested status region below does. -->
      <div class="toast-layer" :class="{ 'toast-layer--sheet': toastAnchor }" :style="toastAnchor ? undefined : { bottom: bottomOffset }" aria-live="off">
        <ToastRoot
          v-for="item in items"
          :key="item.id"
          class="toast"
          type="background"
          :duration="Infinity"
          :open="item.id === current?.id"
          :aria-hidden="item.id === current?.id ? undefined : 'true'"
          :inert="item.id !== current?.id || undefined"
          @update:open="onOpenChange(item.id, $event)"
          @escape-key-down="onEscapeKeyDown"
          @focusin="hold('focus')"
          @focusout="onFocusOut"
          @pointerenter="hold('hover')"
          @pointerleave="release('hover')"
          @touchstart.stop
          @pointerdown.stop
        >
          <ToastTitle class="toast__text">{{ item.text }}</ToastTitle>
          <ToastAction
            v-if="item.actionLabel"
            class="toast__action"
            :alt-text="t('common.toast.actionAlt', { action: item.actionLabel })"
            aria-keyshortcuts="Control+Z"
            @click="item.id === current?.id && runAction()"
          >
            {{ item.actionLabel }}
          </ToastAction>
        </ToastRoot>
        <ToastViewport class="toast-viewport" :label="t('common.toast.region')" />
        <div class="toast-announcer" role="status" aria-live="polite" aria-atomic="true" data-testid="toast-announcer">{{ announcement }}</div>
      </div>
    </Teleport>
  </ToastProvider>
</template>

<style scoped>
.toast-layer {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: min(100% - 2 * var(--page-pad-x), var(--page-max-width) - 2 * var(--page-pad-x));
  /* Above the bottom nav (30). Inside a sheet it is part of the sheet (see below). */
  z-index: 60;
  pointer-events: none;
}

/* Inside the topmost sheet: pinned to the sheet's bottom edge, where the sheet keeps room for it. */
.toast-layer--sheet {
  position: absolute;
  left: var(--page-pad-x);
  right: var(--page-pad-x);
  bottom: calc(20px + env(safe-area-inset-bottom));
  width: auto;
  transform: none;
}

/* Visually hidden, but (unlike Reka's announcer) still in the accessibility tree. */
.toast-announcer {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Reka renders the region around this list. The old and the new toast share one grid cell. */
.toast-layer :deep(.toast-viewport) {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
  outline: none;
}

.toast-layer :deep(.toast) {
  grid-area: 1 / 1;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 56px;
  background: var(--color-inverse);
  color: var(--color-inverse-ink);
  border-radius: var(--radius-md);
  padding: 6px 6px 6px 18px;
  font: 700 15px var(--font-body);
  box-shadow: var(--shadow-toast);
}

.toast-layer :deep(.toast__text) {
  min-width: 0;
  margin: 0;
  font: inherit;
}

.toast-layer :deep(.toast__action) {
  flex: none;
  height: var(--touch-target);
  padding: 0 16px;
  border: 0;
  border-radius: 14px;
  background: var(--color-inverse-button);
  color: var(--color-inverse-button-ink);
  font: 800 15px var(--font-body);
}

.toast-layer :deep(.toast[data-state='open']) {
  animation: toast-in var(--duration-fast) var(--ease-out);
}

.toast-layer :deep(.toast[data-state='closed']) {
  animation: toast-out var(--duration-fast) var(--ease-out) forwards;
  pointer-events: none;
}

/* Swipe right to dismiss: follow the finger, spring back on cancel, fly out on release. */
.toast-layer :deep(.toast[data-swipe='move']) {
  transform: translateX(var(--reka-toast-swipe-move-x));
}

.toast-layer :deep(.toast[data-swipe='cancel']) {
  transform: translateX(0);
  transition: transform var(--duration-fast) var(--ease-out);
}

.toast-layer :deep(.toast[data-state='closed'][data-swipe='end']) {
  animation: toast-swipe-out var(--duration-fast) var(--ease-out) forwards;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes toast-out {
  to {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes toast-swipe-out {
  from {
    transform: translateX(var(--reka-toast-swipe-end-x));
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
