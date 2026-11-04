import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sco.pe.kr',
  output: 'static',
  trailingSlash: 'always',
  redirects: { '/design/luminous/': '/' },
  devToolbar: { enabled: false },
});
