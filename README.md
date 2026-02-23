# Extendo
![Extendo Icon](./icon.png)

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/f693f5c9-8f42-47a2-83aa-7a5052cbec22.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/f693f5c9-8f42-47a2-83aa-7a5052cbec22)
[![codecov](https://codecov.io/gh/ragaeeb/blackiya/graph/badge.svg?token=M52GQARSGD)](https://codecov.io/gh/ragaeeb/blackiya)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ragaeeb/blackiya/ci.yml?branch=main)](https://github.com/ragaeeb/blackiya/actions)
[![Version](https://img.shields.io/github/v/release/ragaeeb/blackiya)](https://github.com/ragaeeb/blackiya/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)
[![Biome](https://img.shields.io/badge/Biome-%2360a5fa.svg?style=flat&logo=biome&logoColor=white)](https://biomejs.dev)
[![WXT](https://img.shields.io/badge/WXT-%235d2fbf.svg?style=flat&logo=wxt&logoColor=white)](https://wxt.dev)

Extendo is a Manifest V3 browser extension built with WXT + React + TypeScript.

The extension provides a lightweight workflow for querying configured endpoints from:
- a popup UI (query current URL)
- a context-menu action (query selected text)
- an options page (configure API instances)

It also includes content-script support for clipboard shortcut actions and a background listener for Blackiya events.

## Tech Stack

- WXT (MV3 extension framework)
- React 19
- TypeScript (ESNext target)
- Tailwind CSS v4 + shadcn/ui primitives
- Bun (package manager + scripts)

## Current Features

- Popup URL query flow
  - Reads active tab URL, normalizes input, and calls configured URL endpoint.
  - Supports utility actions like URL decode and protocol stripping.
- Context-menu selected-text query flow
  - Adds `Query Selected Text` context action.
  - Calls configured content endpoint and stores results for popup consumption.
- Options page for endpoint configuration
  - IlmTest API instance (used for `GET /entries.php?url=...` and `GET /entries.php?query=...`)
  - Translations API instance (used for translation `POST` and compilation excerpt `GET`)
- Clipboard shortcuts (content script)
  - `Left Command + Left Option + 0` -> `maxTokens=10000`
  - `Right Command + Right Option + 0` -> `maxTokens=20000`
  - `Left Command + Left Option + 7` -> `maxTokens=7000`
  - `Right Command + Right Option + 5` -> `maxTokens=15000`
- UI system
  - Tailwind + shadcn setup with project branding tokens in `assets/tailwind.css`.

## Project Structure

- `entrypoints/background.ts` - MV3 service worker orchestration and listeners.
- `entrypoints/popup/*` - popup UI and URL query flow.
- `entrypoints/options/*` - extension options page.
- `entrypoints/content.ts` - content-script message handler and clipboard + toast behavior.
- `src/api/index.ts` - network request helper.
- `src/background/*` - background constants, types, pure utility functions, and tests.
- `src/components/ui/button.tsx` - shared shadcn button primitive.
- `src/utils/*` - shared utilities (storage, logger, helpers).
- `assets/tailwind.css` - Tailwind theme tokens and base styles.

## Scripts

- `bun run dev` - run WXT dev server
- `bun run dev:firefox` - run WXT dev server for Firefox
- `bun run compile` - TypeScript check (`tsc --noEmit`)
- `bun run build` - production build
- `bun run zip` - package extension zip

## Local Development

1. Install dependencies:
   - `bun install`
2. Start dev mode:
   - `bun run dev`
3. Load generated extension in browser when prompted by WXT.
4. Open options and configure:
   - IlmTest API Instance
   - Translations API Instance
   - Blackiya Extension ID

## Notes

- This project uses Bun for all package and script operations.
- If you add new public assets used by content scripts via `browser.runtime.getURL(...)`, regenerate WXT types with:
  - `bun install` (runs `wxt prepare`)
