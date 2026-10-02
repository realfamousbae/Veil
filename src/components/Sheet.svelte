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

  const PEEK = 76;
  const TOP_GAP = 84; // keeps the floating search bar visible when the sheet is full
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
  class="sheet glass glass-panel"
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
  /* Phone: a floating glass sheet, inset from the screen edges. */
  .sheet {
    position: absolute;
    inset: auto 8px calc(8px + env(safe-area-inset-bottom));
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: var(--sheet-full);
    border-radius: var(--radius-xl);
    color: var(--color-text);
    transform: translateY(var(--sheet-y));
    transition: transform 0.32s cubic-bezier(0.2, 0.9, 0.25, 1);
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
    height: 28px;
    padding: 0;
    border: 0;
    background: none;
    cursor: grab;
    touch-action: none;
  }

  .grip {
    width: 36px;
    height: 5px;
    border-radius: var(--radius-full);
    background: var(--color-text-muted);
    opacity: 0.4;
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 4px 16px 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    .sheet {
      transition: none;
    }
  }

  /* Desktop: a floating glass column over the map, below the search bar. */
  @container shell (min-width: 768px) {
    .sheet {
      inset: 82px auto 16px 16px;
      width: 380px;
      height: auto;
      transform: none;
      transition: none;
    }

    .handle {
      display: none;
    }

    .content {
      padding-top: 12px;
    }
  }
</style>
