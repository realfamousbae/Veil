import '@fontsource-variable/jetbrains-mono';
import 'maplibre-gl/dist/maplibre-gl.css';
import './app/global.css';
import './app/glass.css';
import './app/ui.css';
import { mount } from 'svelte';
import App from './app/App.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('#app element not found');

export default mount(App, { target });
