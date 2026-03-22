import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

export default defineConfig({
  site: 'https://www.opositasmart.com',
  integrations: [sitemap(), react()],
  output: 'static',
});