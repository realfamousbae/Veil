// Components may only use theme tokens (CSS custom properties) for colors,
// radii and shadows. See PLAN.md §6.
const varOnly = ['/^var\\(--/'];

export default {
  extends: ['stylelint-config-standard', 'stylelint-config-html/svelte'],
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
      'color',
      'color-mix',
    ],
    'declaration-property-value-allowed-list': {
      '/radius$/': [...varOnly, '0', '50%', 'inherit'],
      '/shadow$/': [...varOnly, 'none'],
    },
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
  },
};
