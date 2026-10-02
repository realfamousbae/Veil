<script lang="ts" module>
  export type SheetSnap = 'collapsed' | 'half' | 'full';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '../lib/i18n/i18n.svelte';

  /**
   * Results/place panel. On narrow containers it is a bottom sheet with three snap
   * positions, driven by drag, click or arrow keys; on wide ones a static side panel.
   */
  interface Props {
    children: Snippet;
    snap?: SheetSnap;
    /** Height of the layout the sheet lives in, px. */
    containerHeight: number;
    /** Currently visible sheet height, px (for placing map controls above it). */
    visibleHeight?: number;
    /** Wide layout: the panel is always fully visible. */
    wide: boolean;
  }

  let {
    children,
    snap = $bindable('collapsed'),
    containerHeight,
    visibleHeight = $bindable(0),
    wide,
  }: Props = $props();

  const PEEK = 64;
  const TOP_GAP = 80; // keeps the floating search bar visible when the sheet is full
  const ORDER: SheetSnap[] = ['collapsed', 'half', 'full'];

  const heights = $derived({
    collapsed: PEEK,
    half: Math.round(containerHeight * 0.5),
    full: Math.max(PEEK, containerHeight - TOP_GAP),
  });

  let drag = $state<{ startY: number; startH: number; h: number; t: number; v: number } | null>(
    null,
  );

  const height = $derived(drag ? drag.h : heights[snap]);
  $effect(() => {
    visibleHeight = height;
  });

  function step(dir: 1 | -1) {
    const i = ORDER.indexOf(snap) + dir;
    snap = ORDER[Math.min(ORDER.length - 1, Math.max(0, i))] ?? snap;
  }

  function onpointerdown(e: PointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag = { startY: e.clientY, startH: heights[snap], h: heights[snap], t: e.timeStamp, v: 0 };
  }

  function onpointermove(e: PointerEvent) {
    if (!drag) return;
    const h = Math.min(heights.full, Math.max(PEEK, drag.startH + drag.startY - e.clientY));
    const dt = e.timeStamp - drag.t;
    if (dt > 0) drag.v = (h - drag.h) / dt;
    drag.h = h;
    drag.t = e.timeStamp;
  }

  function onpointerup(e: PointerEvent) {
    if (!drag) return;
    const { h, startY, v } = drag;
    drag = null;
    if (Math.abs(e.clientY - startY) < 6) {
      // A tap on the handle: toggle between collapsed and half.
      snap = snap === 'collapsed' ? 'half' : 'collapsed';
    } else if (Math.abs(v) > 0.5) {
      // A flick: move one position in its direction.
      step(v > 0 ? 1 : -1);
    } else {
      snap = ORDER.reduce((best, s) =>
        Math.abs(heights[s] - h) < Math.abs(heights[best] - h) ? s : best,
      );
    }
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') step(1);
    else if (e.key === 'ArrowDown') step(-1);
    else if (e.key === 'Enter' || e.key === ' ') snap = snap === 'collapsed' ? 'half' : 'collapsed';
    else return;
    e.preventDefault();
  }
</script>

<section
  class="sheet"
  class:dragging={drag}
  data-snap={snap}
  style:--sheet-full="{heights.full}px"
  style:--sheet-y="{heights.full - height}px"
>
  <button
    class="handle"
    type="button"
    aria-label={snap === 'collapsed' ? t('sheet.expand') : t('sheet.collapse')}
    aria-expanded={snap !== 'collapsed'}
    {onpointerdown}
    {onpointermove}
    {onpointerup}
    onpointercancel={onpointerup}
    {onkeydown}
  >
    <span class="grip"></span>
  </button>
  <div class="content" inert={!wide && snap === 'collapsed' && !drag ? true : undefined}>
    {@render children()}
  </div>
</section>

<style>
  .sheet {
    position: absolute;
    inset: auto 0 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: var(--sheet-full);
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--color-surface);
    color: var(--color-text);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: var(--shadow-lg);
    transform: translateY(var(--sheet-y));
    transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform;
  }

  .sheet.dragging {
    transition: none;
  }

  .handle {
    display: flex;
    flex: none;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 44px;
    padding: 0;
    border: 0;
    background: none;
    cursor: grab;
    touch-action: none;
  }

  .grip {
    width: 40px;
    height: 5px;
    border-radius: var(--radius-full);
    background: var(--color-border);
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 16px 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    .sheet {
      transition: none;
    }
  }

  /* Wide layout: a static side panel; drag state is ignored. */
  @container shell (min-width: 768px) {
    .sheet {
      position: static;
      grid-area: panel;
      height: auto;
      padding-bottom: 0;
      border-radius: 0;
      box-shadow: none;
      transform: none;
      transition: none;
    }

    .handle {
      display: none;
    }
  }
</style>
