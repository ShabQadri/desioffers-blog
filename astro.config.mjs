import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://blog.desioffers.com',
  output: 'static',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => 
        !page.includes('/admin/') && 
        !page.includes('/search/') && 
        !page.includes('/drafts/'),
    }),
  ],
  build: {
    format: 'directory',
  },
});
