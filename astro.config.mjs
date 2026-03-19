import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://opositasmart-landing.vercel.app',
  integrations: [sitemap()],
  output: 'static',
});
