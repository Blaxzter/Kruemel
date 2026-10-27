<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useSlots, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DrawerClose, DrawerContent, DrawerDescription, DrawerHandle, DrawerOverlay, DrawerPortal, DrawerRoot, DrawerTitle } from 'reka-ui'
import { popSheet, pushSheet, setSheetToastAnchor } from '@/composables/sheetStack'
import { useToast } from '@/composables/useToast'

/**
 * Accessible modal bottom sheet, built on Reka UI's Drawer.
 *
 * Usage:
 *   <BottomSheet :open="isOpen" :title="t('today.parts.morning')" @close="isOpen = false">
 *     <template #action><button @click="isOpen = false">{{ t('common.actions.done') }}</button></template>
 *     ...content...
 *   </BottomSheet>
 *
 * Optional slots: `leading` (before the title, e.g. an icon) and `subtitle` (under the title,
 * also the dialog's description). A plain-text `description` prop does the same.
 *
 * Reka provides the dialog semantics, focus trap, scroll lock, aria-hiding of the page behind,
 * Esc, backdrop tap and swipe down to dismiss. Swipe dismissal goes through Reka's snap-point path
 * (one snap point: fully open), which closes on a drag past half the sheet height or a fast fling.
 * Without snap points Reka closes after a fixed 40px, whatever the sheet height, so a short slow
 * pull would already close a tall sheet. On top of that: focus moves to `initialFocus` if
 * given, else to the first focusable element in the content (not the header), and returns to the
 * element that had focus before the sheet opened.
 *
 * While open, a visible toast (e.g. "Undo") is rendered inside the sheet (see sheetStack), so it
 * is part of the dialog's focus cycle, and the sheet grows a bottom padding so the toast does not
 * cover its content.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    /** Visible heading; also the dialog's accessible name. */
    title: string
    /** Heading level of the title. Sheets over a page use h2 by default. */
    headingLevel?: 1 | 2
    /** CSS selector (inside the sheet) of the element to focus on open. */
    initialFocus?: string
    /** Optional plain-text description under the title (the dialog's accessible description). */
    description?: string
    /**
     * Shape from the design: `list` (part of the day, 28px corners, 28px bottom padding) or
     * `form` (describe / tile editor, 32px corners, 24px bottom padding).
     */
    variant?: 'list' | 'form'
  }>(),
  { headingLevel: 2, initialFocus: undefined, description: undefined, variant: 'list' },
)

const emit = defineEmits<{ close: [] }>()
const slots = useSlots()

// A single snap point (fully open): see the note on swipe dismissal above.
const SNAP_POINTS = [1]

const { t } = useI18n()
const scroller = ref<HTMLElement | null>(null)
let returnFocusTo: HTMLElement | null = null
let sheetId: number | null = null

const { current: toast, dismiss: dismissToast } = useToast()
const toastVisible = computed(() => toast.value !== null)
const hasDescription = computed(() => !!props.description || !!slots.subtitle)
// Reka always points aria-describedby at its description id; drop it when there is none.
const describedBy = computed(() => (hasDescription.value ? {} : { 'aria-describedby': undefined }))

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function firstFocusable(root: Element | null | undefined): HTMLElement | undefined {
  return root?.querySelector<HTMLElement>(FOCUSABLE) ?? undefined
}

/** Reka would focus the first tabbable element (the header button); we prefer the content. */
function onOpenAutoFocus(event: Event): void {
  event.preventDefault()
  const panel = scroller.value?.closest<HTMLElement>('[role="dialog"]')
  const explicit = props.initialFocus ? panel?.querySelector<HTMLElement>(props.initialFocus) : null
  const target = explicit ?? firstFocusable(scroller.value?.querySelector('.sheet__body')) ?? firstFocusable(scroller.value) ?? panel
  target?.focus()
}

/** We have no DrawerTrigger, so Reka does not know the opener: restore focus ourselves. */
function onCloseAutoFocus(event: Event): void {
  event.preventDefault()
  const target = returnFocusTo
  returnFocusTo = null
  if (target?.isConnected) target.focus()
}

function inToast(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('.toast-layer')
}

/**
 * Esc while the toast (inside this sheet) has focus closes only the toast. Preventing the event
 * also stops Reka's toast handler, so the toast is dismissed here.
 */
function onEscapeKeyDown(event: KeyboardEvent): void {
  if (!inToast(document.activeElement)) return
  event.preventDefault()
  dismissToast()
}

function onOpenChange(open: boolean): void {
  if (!open) emit('close')
}

function setToastAnchor(el: unknown): void {
  if (sheetId !== null) setSheetToastAnchor(sheetId, el instanceof HTMLElement ? el : null)
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      returnFocusTo = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
      if (sheetId === null) sheetId = pushSheet()
    } else {
      release()
    }
  },
  { immediate: true },
)

/** Leaves the sheet stack, so the toast moves back to <body>. */
function release(): void {
  if (sheetId !== null) popSheet(sheetId)
  sheetId = null
}

onBeforeUnmount(release)
</script>

<template>
  <DrawerRoot :open="open" swipe-direction="down" :snap-points="SNAP_POINTS" :snap-point="1" @update:open="onOpenChange">
    <DrawerPortal>
      <DrawerOverlay class="sheet-backdrop" data-testid="sheet-backdrop" />
      <DrawerContent
        class="sheet"
        :class="`sheet--${variant}`"
        aria-modal="true"
        v-bind="describedBy"
        @open-auto-focus="onOpenAutoFocus"
        @close-auto-focus="onCloseAutoFocus"
        @escape-key-down="onEscapeKeyDown"
      >
        <div ref="scroller" class="sheet__scroll" :class="{ 'sheet__scroll--toast': toastVisible }">
          <DrawerHandle class="sheet__handle" />
          <header class="sheet__header">
            <slot name="leading" />
            <div class="sheet__heading">
              <DrawerTitle :as="headingLevel === 1 ? 'h1' : 'h2'" class="sheet__title">{{ title }}</DrawerTitle>
              <DrawerDescription v-if="hasDescription" as="div" class="sheet__description">
                <slot name="subtitle">{{ description }}</slot>
              </DrawerDescription>
            </div>
            <slot name="action">
              <DrawerClose class="sheet__close">{{ t('common.actions.done') }}</DrawerClose>
            </slot>
          </header>
          <div class="sheet__body">
            <slot />
          </div>
        </div>
        <!-- ToastHost teleports the toast here while this is the topmost sheet. -->
        <div :ref="setToastAnchor" class="sheet__toast-anchor"></div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: var(--color-backdrop);
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  margin: 0 auto;
  width: 100%;
  max-width: var(--page-max-width);
  /* Keeps at least 24px of the page visible above a tall sheet, and its top (with the drag handle)
     below the status bar / notch when the app is drawn under it (viewport-fit=cover). */
  max-height: calc(100dvh - max(24px, env(safe-area-inset-top) + 12px));
  display: flex;
  flex-direction: column;
  background: var(--color-ground);
  color: var(--color-ink);
  --sheet-radius: var(--radius-sheet);
  --sheet-pad-bottom: 28px;
  border-radius: var(--sheet-radius) var(--sheet-radius) 0 0;
  /* Follows the finger while swiping (Reka sets the offset); eases back when let go. With a snap
     point Reka also tracks upward drags, which must not lift the sheet off the bottom edge. */
  transform: translateY(calc(var(--drawer-snap-point-offset, 0px) + max(0px, var(--drawer-swipe-movement-y, 0px))));
  transition: transform var(--duration-sheet) var(--ease-out);
}

.sheet--form {
  --sheet-radius: var(--radius-xl);
  --sheet-pad-bottom: 24px;
}

.sheet[data-swiping] {
  transition-duration: 0ms;
}

.sheet:focus-visible {
  outline: none;
}

.sheet__scroll {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px var(--page-pad-x) calc(var(--sheet-pad-bottom) + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Room for a toast at the bottom edge (20px offset + 56px toast + 12px gap), so it covers nothing. */
.sheet__scroll--toast {
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}

.sheet__toast-anchor {
  display: contents;
}

.sheet__handle {
  flex: none;
  align-self: center;
  width: 44px;
  height: 5px;
  border-radius: 3px;
  background: var(--color-handle);
}

.sheet__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.sheet__heading {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sheet__title {
  font-size: 24px;
  overflow-wrap: anywhere;
}

.sheet__description {
  display: flex;
  flex-direction: column;
}

.sheet__close {
  height: var(--touch-target);
  padding: 0 6px;
  border: 0;
  background: transparent;
  color: var(--color-link);
  font: 800 15px var(--font-body);
}

.sheet__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Enter / exit. `translate` composes with the swipe `transform` above instead of replacing it. */
.sheet[data-state='open'] {
  animation: sheet-in var(--duration-sheet) var(--ease-out);
}

.sheet[data-state='closed'] {
  animation: sheet-out var(--duration-sheet) var(--ease-out) forwards;
  /* A closing sheet is still visible for a moment; it must not take taps any more. */
  pointer-events: none;
}

.sheet-backdrop[data-state='open'] {
  animation: backdrop-in var(--duration-sheet) ease;
}

.sheet-backdrop[data-state='closed'] {
  animation: backdrop-out var(--duration-sheet) ease forwards;
  pointer-events: none;
}

@keyframes sheet-in {
  from {
    translate: 0 100%;
  }
}

@keyframes sheet-out {
  to {
    translate: 0 100%;
  }
}

@keyframes backdrop-in {
  from {
    opacity: 0;
  }
}

@keyframes backdrop-out {
  to {
    opacity: 0;
  }
}

/*
 * No sliding: the sheet fades in and out, and snaps back (no easing) after a short drag. The
 * global reduced-motion rule (base.css) cuts every animation to 0.01ms; a plain opacity fade is
 * no motion, so sheet and backdrop keep their full duration here.
 */
@media (prefers-reduced-motion: reduce) {
  .sheet {
    transition: none;
  }

  .sheet[data-state='open'] {
    animation-name: backdrop-in;
  }

  .sheet[data-state='closed'] {
    animation-name: backdrop-out;
  }

  .sheet[data-state],
  .sheet-backdrop[data-state] {
    animation-duration: var(--duration-sheet) !important;
  }
}
</style>
