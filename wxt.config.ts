import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import { description, name } from './package.json';

// See https://wxt.dev/api/config.html
export default defineConfig({
    outDir: 'dist',
    modules: ['@wxt-dev/module-react'],
    manifest: {
        host_permissions: ['<all_urls>'],
        description,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        permissions: ['alarms', 'contextMenus', 'storage', 'tabs'],
    },
    vite: () => ({
        plugins: [tailwindcss()],
    }),
});
