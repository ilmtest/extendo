import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { defineConfig } from 'wxt';
import { description, name } from './package.json';

const ALLITERATION_CODENAMES = [
    'Agile Aardvark',
    'Brisk Badger',
    'Calm Cheetah',
    'Daring Dolphin',
    'Eager Eagle',
    'Fuzzy Falcon',
    'Gentle Giraffe',
    'Humble Hedgehog',
    'Icy Ibex',
    'Jolly Jaguar',
    'Kind Koala',
    'Lively Lynx',
    'Mellow Marmot',
    'Nimble Newt',
    'Odd Otter',
    'Plucky Penguin',
    'Quick Quokka',
    'Rapid Raccoon',
    'Steady Sparrow',
    'Tidy Tiger',
    'Urban Urchin',
    'Vivid Vulture',
    'Witty Walrus',
    'Xtra Xenops',
    'Young Yak',
    'Zesty Zebra',
] as const;

const resolveCommitShortSha = () => {
    try {
        return execSync('git rev-parse --short HEAD', {
            stdio: ['ignore', 'pipe', 'ignore'],
        })
            .toString()
            .trim();
    } catch {
        return 'nogit';
    }
};

const BUILD_COMMIT_SHA = resolveCommitShortSha();
const BUILD_ID = `${BUILD_COMMIT_SHA}-${Date.now().toString(36)}`;
const codenameIndex =
    BUILD_ID.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % ALLITERATION_CODENAMES.length;
const BUILD_CODENAME = ALLITERATION_CODENAMES[codenameIndex] ?? 'Mellow Marmot';
const BASE_NAME = name.charAt(0).toUpperCase() + name.slice(1);
const MANIFEST_NAME = `${BASE_NAME} [${BUILD_CODENAME} ${BUILD_COMMIT_SHA}]`;

// See https://wxt.dev/api/config.html
export default defineConfig({
    outDir: 'dist',
    modules: ['@wxt-dev/module-react'],
    manifest: {
        host_permissions: ['<all_urls>'],
        description,
        name: MANIFEST_NAME,
        permissions: ['contextMenus', 'storage', 'tabs'],
        web_accessible_resources: [
            {
                resources: ['icon/*.png'],
                matches: ['<all_urls>'],
            },
        ],
    },
    vite: () => ({
        plugins: [tailwindcss()],
    }),
});
