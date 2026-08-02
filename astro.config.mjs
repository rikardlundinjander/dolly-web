// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://heydolly.app',
  // Låt dev-servern följa tilldelad port (t.ex. från preview-panelen)
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321
  },
  vite: {
    plugins: [tailwindcss()]
  }
});