import pkg from '../package.json';

const manifest = {
    action: {
        default_icon: {
            16: 'icons/16.png',
            19: 'icons/19.png',
            32: 'icons/32.png',
            38: 'icons/38.png',
        },
        default_popup: 'src/entries/popup/index.html',
    },
    background: {
        service_worker: 'src/entries/background/main.js',
    },
    host_permissions: ['<all_urls>'],
    icons: {
        16: 'icons/16.png',
        19: 'icons/19.png',
        32: 'icons/32.png',
        38: 'icons/38.png',
        48: 'icons/48.png',
        64: 'icons/64.png',
        96: 'icons/96.png',
        128: 'icons/128.png',
        256: 'icons/256.png',
        512: 'icons/512.png',
    },
    options_ui: {
        open_in_tab: true,
        page: 'src/entries/options/index.html',
    },
    permissions: ['contextMenus', 'storage', 'tabs'],
};

export function getManifest() {
    return {
        author: pkg.author,
        description: pkg.description,
        manifest_version: 3,
        name: pkg.displayName ?? pkg.name,
        version: pkg.version,
        ...manifest,
    };
}

export default getManifest;
