<script setup lang="ts">
// Port of design/TreeArt.dc.html: one inline SVG drawn from a pure, memoized layout.
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePrefersReducedMotion, useMinuteClock } from './environment'
import { layoutTree } from './layout'
import { resolveSeason, resolveTimeOfDay, SCENE_COLORS as C, SEASON_PALETTES, TIME_STYLES } from './palettes'
import type { TreeViewProps } from './types'

const props = withDefaults(
  defineProps<
    TreeViewProps & {
      /** Never animate (small thumbnails, where a sway moves about a pixel but repaints every frame). */
      still?: boolean
    }
  >(),
  { season: 'auto', time: 'auto', size: 340, bird: false, fresh: false, still: false },
)

const { t } = useI18n()
const reducedMotion = usePrefersReducedMotion()
const now = useMinuteClock()
const clipId = `tree-clip-${useId()}`

// Corner radius of the scene, 8% of the width (in viewBox units).
const CORNER_RADIUS = 360 * 0.08

const STARS = [
  { cx: 38, cy: 44, r: 1.6, delay: 0 },
  { cx: 92, cy: 90, r: 1.2, delay: -1 },
  { cx: 150, cy: 34, r: 1.8, delay: -2 },
  { cx: 230, cy: 58, r: 1.3, delay: -0.5 },
  { cx: 330, cy: 140, r: 1.5, delay: -1.6 },
  { cx: 24, cy: 160, r: 1.3, delay: -2.4 },
  { cx: 196, cy: 20, r: 1.1, delay: -2.9 },
] as const
const SNOW = [
  [42, 60, 3],
  [100, 36, 2.5],
  [306, 80, 3],
  [330, 190, 2],
  [30, 250, 2.5],
  [318, 300, 2.5],
  [212, 26, 2],
] as const
const FLOWER_PETALS = [
  [0, -3],
  [2.9, -0.9],
  [1.8, 2.4],
  [-1.8, 2.4],
  [-2.9, -0.9],
] as const

// Geometry only depends on seed and leaf count; colours and clock changes don't recompute it.
const layout = computed(() => layoutTree(props.seed, props.leaves))
const palette = computed(() => SEASON_PALETTES[resolveSeason(props.season, now.value)])
const timeStyle = computed(() => TIME_STYLES[resolveTimeOfDay(props.time, now.value)])
const isWinter = computed(() => resolveSeason(props.season, now.value) === 'winter')
const sky = computed(() => timeStyle.value.sky ?? palette.value.sky)
const animated = computed(() => !props.still && !reducedMotion.value)

const width = computed(() => Math.round(Math.max(60, props.size)))
const height = computed(() => Math.round((width.value * 440) / 360))

const leafItems = computed(() => {
  const { leaves, leafCount } = layout.value
  const colors = palette.value.leaves
  return leaves.map((spot, i) => {
    const isNew = props.fresh && i === leafCount - 1
    return {
      transform: spot.transform,
      fill: colors[(i * 7) % colors.length],
      isNew,
    }
  })
})

const label = computed(() =>
  layout.value.isSeed ? t('tree.seedLabel') : t('tree.label', { n: layout.value.leafCount }, layout.value.leafCount),
)
</script>

<template>
  <svg
    class="tree-view"
    :class="{ 'tree-view--still': !animated }"
    :width="width"
    :height="height"
    viewBox="0 0 360 440"
    role="img"
    :aria-label="label"
    data-testid="tree-view"
    :data-leaves="layout.leafCount"
  >
    <defs>
      <clipPath :id="clipId">
        <rect width="360" height="440" :rx="CORNER_RADIUS" :ry="CORNER_RADIUS" />
      </clipPath>
    </defs>
    <g :clip-path="`url(#${clipId})`">
      <rect width="360" height="440" :fill="sky" data-part="sky" />

      <template v-if="!timeStyle.sun">
        <g :fill="C.star" data-part="stars">
          <circle
            v-for="star in STARS"
            :key="star.cx"
            :class="{ star: animated }"
            :cx="star.cx"
            :cy="star.cy"
            :r="star.r"
            :style="star.delay ? { animationDelay: `${star.delay}s` } : undefined"
          />
        </g>
        <g data-part="moon">
          <circle cx="292" cy="72" r="20" :fill="C.moon" />
          <circle cx="302" cy="64" r="17" :fill="sky" />
        </g>
      </template>
      <circle v-else :cx="timeStyle.sun.x" :cy="timeStyle.sun.y" :r="timeStyle.sun.r" :fill="timeStyle.sun.fill" data-part="sun" />

      <template v-if="timeStyle.clouds">
        <g :class="{ 'cloud-a': animated }" :fill="C.cloud" opacity="0.85" data-part="cloud">
          <path d="M10 92 C10 82 22 78 30 84 C34 72 54 72 58 84 C66 80 76 86 74 92 Z" />
        </g>
        <g :class="{ 'cloud-b': animated }" :fill="C.cloud" opacity="0.7" data-part="cloud">
          <path d="M0 150 C0 142 10 139 16 143 C20 134 36 134 40 143 C46 140 54 145 52 150 Z" />
        </g>
      </template>

      <g v-if="isWinter" :fill="C.snow" data-part="snow">
        <circle v-for="[cx, cy, r] in SNOW" :key="`${cx}-${cy}`" :cx="cx" :cy="cy" :r="r" />
      </g>

      <path d="M0 426 Q180 390 360 426 L360 440 L0 440 Z" :fill="palette.ground" />
      <g fill="none" :stroke="palette.grass" stroke-width="2" stroke-linecap="round">
        <path d="M50 420 l-3 -9 M54 420 l1 -11 M58 420 l4 -8" />
        <path d="M296 420 l-3 -8 M300 420 l1 -10 M304 420 l4 -7" />
      </g>

      <g :class="{ sway: animated }">
        <g :transform="layout.grow" :stroke="palette.bark" stroke-linecap="round" data-part="branches">
          <line
            v-for="(s, i) in layout.segments"
            :key="i"
            :x1="s.x1"
            :y1="s.y1"
            :x2="s.x2"
            :y2="s.y2"
            :stroke-width="s.w"
          />
        </g>

        <template v-if="layout.swing.visible">
          <g :stroke="C.swingRope" stroke-width="1.6" data-part="swing">
            <line :x1="layout.swing.x1" :y1="layout.swing.top" :x2="layout.swing.x1" :y2="layout.swing.seat" />
            <line :x1="layout.swing.x2" :y1="layout.swing.top" :x2="layout.swing.x2" :y2="layout.swing.seat" />
          </g>
          <rect :x="layout.swing.rx" :y="layout.swing.seat" width="30" height="6" rx="3" :fill="C.swingSeat" />
        </template>

        <g v-for="(leaf, i) in leafItems" :key="i" :transform="leaf.transform" data-part="leaf">
          <g :class="{ 'leaf-new': leaf.isNew && animated }" :data-fresh="leaf.isNew || undefined">
            <path
              d="M0 0 C3 -5 9 -6.5 15 -1 Q16 0 15 1 C9 6.5 3 5 0 0 Z"
              :fill="leaf.fill"
              :stroke="leaf.isNew ? C.freshOutline : 'none'"
              :stroke-width="leaf.isNew ? 2 : 0"
            />
            <path d="M1.5 0 L12.5 0" :stroke="palette.rib" stroke-width="0.9" stroke-linecap="round" opacity="0.45" />
          </g>
        </g>

        <g v-for="(transform, i) in layout.flowers" :key="i" :transform="transform" :fill="palette.flower" data-part="flower">
          <circle v-for="[cx, cy] in FLOWER_PETALS" :key="`${cx}-${cy}`" :cx="cx" :cy="cy" r="2.6" />
          <circle cx="0" cy="0" r="1.6" :fill="C.flowerCenter" />
        </g>

        <g v-for="(transform, i) in layout.apples" :key="i" :transform="transform" data-part="apple">
          <path d="M0 -6 L0.6 -9.5" :stroke="C.appleStem" stroke-width="1.4" stroke-linecap="round" />
          <path d="M0.6 -8.5 C2.5 -11 5.5 -10.5 6 -9 C4 -7.5 2 -7.5 0.6 -8.5 Z" :fill="C.appleLeaf" />
          <path
            d="M0 -5.5 C-3 -7.5 -7 -6 -7 -1.5 C-7 3 -3.5 6.5 0 5.5 C3.5 6.5 7 3 7 -1.5 C7 -6 3 -7.5 0 -5.5 Z"
            :fill="C.appleRed"
          />
          <ellipse cx="-3" cy="-2.5" rx="1.4" ry="2" fill="#FFFFFF" opacity="0.55" />
        </g>

        <g v-if="bird && !layout.isSeed" :transform="layout.bird" data-part="bird">
          <g :class="{ 'bird-bob': animated }">
            <path d="M-10 0 C-10 -7 -2 -9 4 -6 C8 -4 9 1 6 5 C1 9 -8 7 -10 0 Z" :fill="C.birdBody" />
            <circle cx="6" cy="-7" r="5" :fill="C.birdBody" />
            <path d="M10.5 -7.8 L15 -6.3 L10.5 -5.2 Z" :fill="C.birdBeak" />
            <circle cx="7.4" cy="-8" r="1.1" :fill="C.birdEye" />
            <path d="M-10 -1 L-17 -5 L-12 3 Z" :fill="C.birdWing" />
            <path d="M-5 -2 C-2 -6 2 -6 3 -1" :stroke="C.birdWing" stroke-width="1.6" fill="none" stroke-linecap="round" />
          </g>
          <path d="M-2 7 L-2 10 M2 7 L2 10" :stroke="C.birdLegs" stroke-width="1.3" stroke-linecap="round" />
        </g>
      </g>

      <g v-if="layout.isSeed" data-part="seed">
        <path d="M160 422 Q180 404 200 422 Z" :fill="C.soil" />
        <ellipse cx="180" cy="411" rx="6.5" ry="4.5" :fill="palette.bark" transform="rotate(-20 180 411)" />
        <path d="M180 407 Q182 400 186 398" :stroke="C.sprout" stroke-width="2" fill="none" stroke-linecap="round" />
      </g>

      <rect width="360" height="440" :fill="timeStyle.tint" :opacity="timeStyle.tintOpacity" pointer-events="none" />
    </g>
  </svg>
</template>

<style scoped>
.tree-view {
  display: block;
  max-width: 100%;
  height: auto;
}

.sway {
  transform-box: view-box;
  transform-origin: 180px 424px;
  animation: tree-sway 7s ease-in-out infinite;
}
.leaf-new {
  animation: leaf-pop 1.4s ease-out 0.4s both;
}
.bird-bob {
  animation: bird-bob 2.6s ease-in-out infinite;
}
.cloud-a {
  animation: cloud-drift 70s linear -20s infinite;
}
.cloud-b {
  animation: cloud-drift 95s linear -60s infinite;
}
.star {
  animation: star-twinkle 3.2s ease-in-out infinite;
}

@keyframes tree-sway {
  0%,
  100% {
    transform: rotate(-0.6deg);
  }
  50% {
    transform: rotate(0.6deg);
  }
}
@keyframes leaf-pop {
  0% {
    transform: scale(0);
  }
  70% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes bird-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2.5px);
  }
}
@keyframes cloud-drift {
  from {
    transform: translateX(-140px);
  }
  to {
    transform: translateX(440px);
  }
}
@keyframes star-twinkle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

/* First paint before the JS preference check, and any later change, stays still too. */
@media (prefers-reduced-motion: reduce) {
  .sway,
  .leaf-new,
  .bird-bob,
  .cloud-a,
  .cloud-b,
  .star {
    animation: none;
  }
}
</style>
