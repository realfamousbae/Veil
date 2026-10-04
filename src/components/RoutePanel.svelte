<script lang="ts">
  import { formatClock, formatDistance, formatDuration } from '../lib/format';
  import { i18n, t, type MessageKey } from '../lib/i18n/i18n.svelte';
  import type { LegMode, RouteLeg, RouteMode } from '../lib/providers/types';
  import type { RouteState } from '../lib/routing/route.svelte';
  import type { SearchState } from '../lib/search/search.svelte';
  import Icon, { type IconName } from './Icon.svelte';
  import RouteField from './RouteField.svelte';

  interface Props {
    route: RouteState;
    /** Modes the router has data for. */
    modes: RouteMode[];
    fromSearch: SearchState;
    toSearch: SearchState;
    onclose: () => void;
    fromInput?: HTMLInputElement;
  }

  let { route, modes, fromSearch, toSearch, onclose, fromInput = $bindable() }: Props = $props();

  const MODE_ICONS: Record<RouteMode, IconName> = { walk: 'walk', transit: 'bus', car: 'car' };
  const LEG_ICONS: Record<LegMode, IconName> = {
    walk: 'walk',
    car: 'car',
    bus: 'bus',
    trolleybus: 'bus',
    tram: 'tram',
    metro: 'metro',
    rail: 'train',
    other: 'bus',
  };
  const TURNS = new Set([
    'DEPART',
    'CONTINUE',
    'LEFT',
    'RIGHT',
    'SLIGHTLY_LEFT',
    'SLIGHTLY_RIGHT',
    'HARD_LEFT',
    'HARD_RIGHT',
    'UTURN_LEFT',
    'UTURN_RIGHT',
    'CIRCLE_CLOCKWISE',
    'CIRCLE_COUNTERCLOCKWISE',
    'STAIRS',
    'ELEVATOR',
  ]);

  const locale = $derived(i18n.locale);
  const busy = $derived(route.status === 'locating' || route.status === 'loading');
  const status = $derived.by(() => {
    if (route.status === 'locating') return t('route.locating');
    if (route.status === 'loading') return t('route.loading');
    if (route.status === 'error') return t('route.error');
    if (route.status === 'offline') return t('route.offline');
    if (route.status === 'done' && !route.itineraries.length) return t('route.none');
    return '';
  });
  const current = $derived(route.itineraries[route.selected]);
  const approximate = $derived(current?.legs.some((l) => l.approximate) ?? false);
  const approximateTrain = $derived(
    current?.legs.some((l) => l.approximate && l.mode === 'rail') ?? false,
  );

  /** Local "YYYY-MM-DDTHH:MM" for <input type="datetime-local">. */
  function localValue(date: Date | null): string {
    if (!date) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
  }

  function turn(direction: string): string {
    return t(`route.turn.${TURNS.has(direction) ? direction : 'other'}` as MessageKey);
  }

  function legTitle(leg: RouteLeg, last: boolean): string {
    const place = last ? t('route.destination') : leg.to.name;
    if (leg.mode === 'walk') return t('route.walkTo', { place });
    if (leg.mode === 'car') return t('route.driveTo', { place });
    return `${leg.from.name} → ${leg.to.name}`;
  }

  /** "Metro 1", with "≈" when its times are estimated; "Walk to …" for other legs. */
  function legName(leg: RouteLeg, last: boolean): string {
    if (!leg.line) return legTitle(leg, last);
    const name = `${t(`route.leg.${leg.mode}`)} ${leg.line.name}`;
    return leg.approximate ? `${name} ≈` : name;
  }

  function legMeta(leg: RouteLeg): string {
    const parts = [formatDuration((leg.end.getTime() - leg.start.getTime()) / 1000, locale)];
    if (leg.distance !== undefined) parts.push(formatDistance(leg.distance, locale));
    if (leg.line) parts.unshift(formatClock(leg.start, locale));
    return parts.join(' · ');
  }
</script>

<article class="route" aria-labelledby="route-title">
  <header>
    <h2 id="route-title">{t('route.title')}</h2>
    <button class="glass icon-btn" type="button" aria-label={t('common.close')} onclick={onclose}>
      <Icon name="close" />
    </button>
  </header>

  <div class="ends">
    <div class="list-group">
      <RouteField
        id="route-from"
        label={t('route.from')}
        placeholder={t('route.fromPlaceholder')}
        value={route.from}
        search={fromSearch}
        onchange={(end) => route.setEnd('from', end)}
        bind:input={fromInput}
      />
      <RouteField
        id="route-to"
        label={t('route.to')}
        placeholder={t('route.toPlaceholder')}
        value={route.to}
        search={toSearch}
        onchange={(end) => route.setEnd('to', end)}
      />
    </div>
    <button
      class="swap glass icon-btn"
      type="button"
      aria-label={t('route.swap')}
      onclick={() => route.swap()}
    >
      <Icon name="swap" />
    </button>
  </div>

  {#if modes.length > 1}
    <div class="segmented" role="radiogroup" aria-label={t('route.modes')}>
      {#each modes as mode (mode)}
        <label class="segment">
          <input
            type="radio"
            name="route-mode"
            value={mode}
            checked={route.mode === mode}
            onchange={() => route.setMode(mode)}
          />
          <span class="mode"><Icon name={MODE_ICONS[mode]} />{t(`route.mode.${mode}`)}</span>
        </label>
      {/each}
    </div>
  {/if}

  {#if route.mode === 'transit'}
    <label class="when list-group list-row">
      <span class="when-label">{t('route.when')}</span>
      <input
        type="datetime-local"
        value={localValue(route.time)}
        onchange={(e) => {
          const v = e.currentTarget.value;
          route.setTime(v ? new Date(v) : null);
        }}
      />
      {#if route.time}
        <button class="pill glass now" type="button" onclick={() => route.setTime(null)}
          >{t('route.leaveNow')}</button
        >
      {/if}
    </label>
  {/if}

  <button
    class="build pill pill-accent glass"
    type="button"
    disabled={!route.ready || busy}
    onclick={() => void route.build()}
  >
    <Icon name="route" />{t('route.build')}
  </button>

  <p class="status" role="status" aria-live="polite">{status}</p>

  {#if route.itineraries.length}
    <h3 class="section-title">{t('route.options')}</h3>
    <ul class="list-group options">
      {#each route.itineraries as it, i (i)}
        <li>
          <button
            class="list-row option"
            class:on={i === route.selected}
            type="button"
            aria-pressed={i === route.selected}
            aria-label={`${t('route.option', { n: i + 1 })}: ${formatDuration(it.duration, locale)}`}
            onclick={() => (route.selected = i)}
          >
            <span class="grow">
              <span class="duration">{formatDuration(it.duration, locale)}</span>
              <span class="hint">
                {t('route.arrive', { time: formatClock(it.end, locale) })}
                {#if route.mode === 'transit'}· {t('route.transfers', { n: it.transfers })}{/if}
              </span>
              {#if route.mode === 'transit'}
                <span class="chips">
                  {#each it.legs as leg, j (j)}
                    {#if leg.line}
                      <span
                        class="chip"
                        style:background={leg.line.color}
                        style:color={leg.line.textColor}
                        title={t(`route.leg.${leg.mode}`)}
                      >
                        <Icon name={LEG_ICONS[leg.mode]} />{leg.line.name}
                      </span>
                    {:else if leg.mode === 'walk'}
                      <span class="chip plain" title={t('route.leg.walk')}
                        ><Icon name="walk" /></span
                      >
                    {/if}
                  {/each}
                </span>
              {/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>

    {#if current}
      {#if approximate}
        <p class="note">
          {t('route.approximate')}{#if approximateTrain}. {t('route.checkTrains')}{/if}
        </p>
      {/if}
      <h3 class="section-title">{t('route.steps')}</h3>
      <ol class="list-group legs">
        {#each current.legs as leg, j (j)}
          <li class="list-row leg">
            <span
              class="badge"
              class:line={!!leg.line}
              style:background={leg.line?.color}
              style:color={leg.line?.textColor}
              aria-label={t(`route.leg.${leg.mode}`)}
            >
              <Icon name={LEG_ICONS[leg.mode]} />
            </span>
            <span class="grow">
              <span class="name">{legName(leg, j === current.legs.length - 1)}</span>
              {#if leg.line}
                <span class="hint">{legTitle(leg, false)}</span>
                {#if leg.line.headsign}
                  <span class="hint">{t('route.towards', { headsign: leg.line.headsign })}</span>
                {/if}
              {/if}
              <span class="hint">{legMeta(leg)}</span>
              {#if leg.steps.length > 1}
                <details>
                  <summary>{t('route.steps')}</summary>
                  <ol class="steps">
                    {#each leg.steps as step, k (k)}
                      <li>
                        {turn(step.direction)}{#if step.street}: {step.street}{/if}
                        <span class="hint">{formatDistance(step.distance, locale)}</span>
                      </li>
                    {/each}
                  </ol>
                </details>
              {/if}
            </span>
          </li>
        {/each}
      </ol>
    {/if}
  {/if}
</article>

<style>
  .route {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h2 {
    margin: 0 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .ends {
    position: relative;
  }

  .ends .list-group {
    overflow: visible;
    padding-right: 48px;
  }

  .swap {
    position: absolute;
    top: 50%;
    right: 4px;
    width: 40px;
    height: 40px;
    transform: translateY(-50%);
    color: var(--color-accent);
  }

  .mode {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .mode :global(.icon) {
    width: 16px;
    height: 16px;
  }

  .when {
    gap: 8px;
  }

  .when-label {
    flex: none;
  }

  .when input {
    flex: 1;
    min-width: 0;
    text-align: end;
    border: 0;
    background: none;
    color: var(--color-text);
    font: inherit;
  }

  .now {
    min-height: 32px;
    padding: 0 12px;
    font-size: 13px;
  }

  .build :global(.icon) {
    width: 18px;
    height: 18px;
  }

  .status,
  .note {
    margin: 0 6px;
    color: var(--color-text-muted);
    font-size: 13px;
  }

  .status:empty {
    display: none;
  }

  .section-title {
    margin: 8px 6px 0;
  }

  .options {
    list-style: none;
  }

  .option.on {
    background: var(--glass-edge);
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .duration {
    display: block;
    font-size: 17px;
    font-weight: 700;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-size: 12px;
    font-weight: 700;
  }

  .chip.plain {
    padding: 2px 4px;
    background: var(--glass-group);
    color: var(--color-text-muted);
  }

  .chip :global(.icon) {
    width: 14px;
    height: 14px;
  }

  .legs {
    list-style: none;
  }

  .leg {
    align-items: flex-start;
  }

  .badge {
    display: grid;
    flex: none;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-full);
    background: var(--glass-group);
    color: var(--color-accent);
  }

  .badge.line {
    background: var(--color-accent);
    color: var(--color-on-accent);
  }

  .badge :global(.icon) {
    width: 16px;
    height: 16px;
  }

  .name {
    display: block;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  details {
    margin-top: 6px;
    font-size: 14px;
  }

  summary {
    color: var(--color-accent);
    cursor: pointer;
  }

  .steps {
    margin: 6px 0 0;
    padding-left: 18px;
  }

  .steps li + li {
    margin-top: 4px;
  }
</style>
