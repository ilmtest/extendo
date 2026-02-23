# Privacy Policy for Extendo

## Overview

Extendo is a browser extension that helps you query your configured APIs and copy compilation excerpts. Extendo only processes data needed to provide these features.

## Data Extendo Processes

- Active tab URL (when you use URL lookup in the popup)
- Selected text (when you use the context-menu text query)
- Conversation payload events from Blackiya (when configured and available)
- Settings you enter in the options page:
  - IlmTest API instance URL
  - Translations API instance URL
  - Blackiya extension ID

## How Data Is Used

- URL and selected text are sent to your configured IlmTest API instance for lookup.
- Blackiya conversation payloads are forwarded to your configured Translations API instance.
- Compilation excerpt requests are sent to your configured Translations API instance.
- Settings are stored locally in `browser.storage.local`.

## Data Sharing

Extendo does not sell data and does not send data to any vendor-owned backend by default.
Data is sent only to endpoints you configure in the extension settings.

## Data Retention

- Local settings remain in browser local extension storage until you change or clear them.
- Query results used by popup workflows are stored locally for extension behavior and may be replaced/removed during normal usage.
- Remote retention depends on the API services you configure.

## Security

Data transmission security depends on the endpoint URLs you configure. Use HTTPS endpoints whenever possible.

## Your Controls

- Update or remove configured endpoints and IDs from the options page at any time.
- Remove the extension to stop all processing.
- Clear extension storage via browser extension settings to remove locally stored data.

## Contact

If you maintain this extension and publish it, add your support/contact email here.
