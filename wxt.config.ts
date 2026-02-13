import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    host_permissions: ['<all_urls>'],
    permissions: ['contextMenus', 'storage', 'tabs'],
    web_accessible_resources: [
      {
        resources: ['wxt.svg', 'blackiya-runner.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
