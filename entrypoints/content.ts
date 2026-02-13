import { browser } from 'wxt/browser';

export const SUPPORTED_PLATFORM_URLS = [
  'https://chatgpt.com/*',
  'https://chat.openai.com/*',
  'https://gemini.google.com/*',
  'https://x.com/i/grok*',
  'https://x.com/i/api/*',
  'https://grok.com/*',
] as const;

type BlackiyaApi = {
  getCommonJSON: () => Promise<unknown>;
};

declare global {
  interface Window {
    __blackiya?: BlackiyaApi;
  }
}

const BUTTON_ID = 'extendo-blackiya-button';
const ROOT_ID = 'extendo-blackiya-root';
const RUNNER_ID = 'extendo-blackiya-runner';
const RUNNER_SRC = '/blackiya-runner.js';

const runInPageContext = () => {
  const existingRunner = document.getElementById(RUNNER_ID);
  if (existingRunner) {
    existingRunner.remove();
  }

  const script = document.createElement('script');
  script.id = RUNNER_ID;
  script.src = browser.runtime.getURL(RUNNER_SRC);
  script.onload = () => script.remove();
  script.onerror = () => {
    console.error('Failed to load blackiya runner script');
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
};

const createButton = () => {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const host = document.createElement('div');
  host.id = ROOT_ID;
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.right = '16px';
  host.style.bottom = '16px';
  host.style.zIndex = '2147483647';

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.setAttribute('aria-label', 'Read common JSON');
  button.style.all = 'initial';
  button.style.width = '44px';
  button.style.height = '44px';
  button.style.border = '1px solid #e2e8f0';
  button.style.borderRadius = '9999px';
  button.style.background = '#ffffff';
  button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.cursor = 'pointer';
  button.style.zIndex = '2147483647';

  const icon = document.createElement('img');
  icon.src = browser.runtime.getURL('/wxt.svg');
  icon.alt = 'WXT';
  icon.width = 22;
  icon.height = 22;
  icon.onerror = () => {
    icon.style.display = 'none';
    button.textContent = 'W';
    button.style.fontFamily = 'system-ui, sans-serif';
    button.style.fontSize = '16px';
    button.style.fontWeight = '700';
    button.style.color = '#309fd6';
  };
  button.appendChild(icon);

  button.addEventListener('click', runInPageContext);

  shadowRoot.appendChild(button);
  document.documentElement.appendChild(host);
};

const mountButton = () => {
  if (!document.documentElement) {
    window.setTimeout(mountButton, 100);
    return;
  }

  createButton();
};

export default defineContentScript({
  matches: [...SUPPORTED_PLATFORM_URLS],
  runAt: 'document_idle',
  main: () => {
    mountButton();

    const observer = new MutationObserver(() => {
      if (!document.getElementById(ROOT_ID)) {
        mountButton();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  },
});
