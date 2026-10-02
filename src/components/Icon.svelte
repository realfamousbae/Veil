<script lang="ts">
  export type IconName = 'plus' | 'minus' | 'search' | 'close' | 'layers' | 'check' | 'back';

  let { name }: { name: IconName } = $props();
  const href = $derived(`${import.meta.env.BASE_URL}assets/icons.svg#${name}`);
</script>

<svg class="icon" aria-hidden="true" focusable="false"><use {href} /></svg>

<style>
  .icon {
    width: 24px;
    height: 24px;
    flex: none;
  }
</style>
