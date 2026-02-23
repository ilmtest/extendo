# AGENTS.md

## Purpose

This file gives AI coding agents the minimum reliable context to make safe, high-signal changes in this repository.

## What This Repo Is

Extendo is a WXT + React + TypeScript browser extension (MV3) with:
- `background` service worker logic
- `popup` UI for URL-based lookups
- `options` page for endpoint configuration
- `content` script UI button for selected host platforms

## Non-Negotiable Conventions

- Use `bun` for all package/script commands.
- Prefer arrow functions over `function` declarations.
- Prefer `type` over `interface` for TypeScript object typing.
- Keep TypeScript output target modern (ESNext-oriented code style).
- Keep responses and docs concise and practical.

## Working Rules For Agents

- Do not run `bun test` unless explicitly asked.
- Do not run `bun run build` unless explicitly asked.
- Use `bun run compile` for safe validation after TS/code edits.
- Prefer small, focused patches over broad rewrites.
- Preserve existing behavior unless user requested a behavior change.

## Architecture Snapshot

- `entrypoints/background.ts`
  - Context-menu registration.
  - Selected-text endpoint lookup.
  - Badge state updates.
- `entrypoints/popup/App.tsx`
  - URL query workflow and result rendering.
- `entrypoints/options/App.tsx`
  - Endpoint config UI with placeholder validation.
- `entrypoints/content.ts`
  - Supported-site floating action button.
  - Page-context bridge trigger.
- `utils/db.ts`
  - `browser.storage.local` wrappers and key management.
- `api/index.ts`
  - Shared GET request utility.

## Known Lessons Learned (Important)

1. Content scripts run in an isolated world.
- Page globals like `window.__blackiya` are not directly callable from content-script scope.
- To access page globals, inject a page-context script file (not inline text on strict CSP sites).

2. CSP blocks inline injected scripts on ChatGPT/Gemini and similar apps.
- Do not rely on `script.textContent = '...'` for page bridging.
- Use `script.src = browser.runtime.getURL('/...')` with a public runner file.

3. Web-accessible resources are required for extension assets used by web pages.
- If content script loads `browser.runtime.getURL('/wxt.svg')` or other files, include them in `manifest.web_accessible_resources`.

4. WXT public asset path typing is generated.
- After adding new files under `public/`, run `bun install` (triggers `wxt prepare`) so `browser.runtime.getURL('/new-file')` type-checks.

5. SPA pages can drop injected nodes.
- Use resilient mounting for content-script UI (guard duplicates and remount when needed).

## Editing Guidance

- Keep UI styles aligned with tokens in `assets/tailwind.css`.
- If adding shadcn components, keep aliases compatible with `components.json` and `tsconfig.json` path mapping.
- Avoid introducing heavy abstractions for simple extension flows.

## Safe Verification Checklist

After changing extension logic:
1. `bun run compile`
2. Reload extension in `chrome://extensions`
3. Hard refresh affected pages/tabs
4. Re-check popup/options/content-script behavior manually

## Git Notes

- Do not assume local branch name is `main`; verify before push.
- If pushing local `master` to remote `main`, use explicit refspec (`master:main`).
