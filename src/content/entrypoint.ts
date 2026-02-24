import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Toaster, toast } from 'sonner';
import 'sonner/dist/styles.css';
import { browser } from 'wxt/browser';
import type { CompilationFetchRequest, CompilationFetchResponse, LLMProvider, TokenVariant } from '@/src/background/types';
import { getMaxTokensForVariant, getProviderFromUrl } from '@/src/background/utils';
import { injectTextViaPaste, resolveEditableTarget } from '@/src/content/paste-target';

const SONNER_ROOT_ID = 'extendo-sonner-root';
const CLIPBOARD_FOCUS_DELAY_MS = 120;
const MODIFIER_CODES = ['MetaLeft', 'MetaRight', 'AltLeft', 'AltRight'] as const;

let sonnerRoot: Root | null = null;
let listenersAttached = false;
const activeModifierCodes = new Set<ModifierCode>();

type Side = 'left' | 'right' | null;
type ModifierCode = (typeof MODIFIER_CODES)[number];

const wait = async (ms: number) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });

const isModifierCode = (code: string): code is ModifierCode => MODIFIER_CODES.includes(code as ModifierCode);

const setModifierPressed = (code: string, isPressed: boolean) => {
    if (!isModifierCode(code)) {
        return;
    }

    if (isPressed) {
        activeModifierCodes.add(code);
        return;
    }

    activeModifierCodes.delete(code);
};

const getModifierSide = (leftCode: ModifierCode, rightCode: ModifierCode): Side => {
    const leftPressed = activeModifierCodes.has(leftCode);
    const rightPressed = activeModifierCodes.has(rightCode);
    if (leftPressed === rightPressed) {
        return null;
    }

    return leftPressed ? 'left' : 'right';
};

const resetModifierState = () => {
    activeModifierCodes.clear();
};

const getVariantFromKeyboardEvent = (event: KeyboardEvent): TokenVariant | null => {
    if (!event.metaKey || !event.altKey) {
        return null;
    }

    const metaSide = getModifierSide('MetaLeft', 'MetaRight');
    const altSide = getModifierSide('AltLeft', 'AltRight');

    if (event.code === 'Digit0' && metaSide === 'left' && altSide === 'left') {
        return 'leftCommandLeftOption0';
    }

    if (event.code === 'Digit0' && metaSide === 'right' && altSide === 'right') {
        return 'rightCommandRightOption0';
    }

    if (event.code === 'Digit7' && metaSide === 'left' && altSide === 'left') {
        return 'leftCommandLeftOption7';
    }

    if (event.code === 'Digit5' && metaSide === 'right' && altSide === 'right') {
        return 'rightCommandRightOption5';
    }

    return null;
};

const copyTextToClipboard = async (value: string) => {
    if (navigator.clipboard?.writeText) {
        if (!document.hasFocus()) {
            window.focus();
            await wait(CLIPBOARD_FOCUS_DELAY_MS);
        }

        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            console.warn('Clipboard API write failed, using fallback copy', error);
        }
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    (document.body ?? document.documentElement).appendChild(textarea);
    textarea.select();

    const copied = document.execCommand('copy');
    textarea.remove();

    if (!copied) {
        throw new Error('Clipboard write failed');
    }
};

const ensureToaster = () => {
    if (document.getElementById(SONNER_ROOT_ID) && sonnerRoot) {
        return;
    }

    const mountNode = document.createElement('div');
    mountNode.id = SONNER_ROOT_ID;
    document.documentElement.appendChild(mountNode);

    sonnerRoot = createRoot(mountNode);
    flushSync(() => {
        sonnerRoot?.render(
            createElement(Toaster, {
                position: 'top-right',
                richColors: true,
                duration: 2000,
                toastOptions: {
                    style: {
                        zIndex: 2147483647,
                    },
                },
            }),
        );
    });
};

const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    ensureToaster();

    if (variant === 'error') {
        toast.error(message);
        return;
    }

    toast.success(message);
};

const isCompilationFetchResponse = (value: unknown): value is CompilationFetchResponse => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const data = value as Record<string, unknown>;
    if (data.ok === true) {
        return typeof data.text === 'string';
    }
    if (data.ok === false) {
        return typeof data.error === 'string';
    }
    return false;
};

const runCopyAction = async (provider: LLMProvider, maxTokens: number, pasteTarget: HTMLElement | null) => {
    try {
        const request = {
            type: 'fetch-compilation-excerpt',
            provider,
            maxTokens,
        } satisfies CompilationFetchRequest;
        const response = await browser.runtime.sendMessage(request);

        if (!isCompilationFetchResponse(response)) {
            throw new Error('Failed to fetch compilation excerpt');
        }

        if (!response.ok) {
            throw new Error(response.error);
        }

        const content = response.text;
        if (pasteTarget && injectTextViaPaste(pasteTarget, content)) {
            showToast(`Pasted ${maxTokens.toLocaleString()} tokens`);
            console.info('Extendo: excerpt pasted into editable target');
            return;
        }

        await copyTextToClipboard(content);
        showToast(`Copied ${maxTokens.toLocaleString()} tokens to clipboard`);
        console.info('Extendo: excerpt copied to clipboard');
    } catch (error) {
        showToast('Copy failed', 'error');
        console.error('Failed to copy excerpt', error);
    }
};

export default defineContentScript({
    matches: ['<all_urls>'],
    runAt: 'document_idle',
    main: () => {
        if (listenersAttached) {
            return;
        }
        listenersAttached = true;

        ensureToaster();

        const handleKeyDown = (event: KeyboardEvent) => {
            setModifierPressed(event.code, true);

            if (event.repeat) {
                return;
            }

            const variant = getVariantFromKeyboardEvent(event);
            if (!variant) {
                return;
            }

            event.preventDefault();
            const provider = getProviderFromUrl(window.location.href);
            const maxTokens = getMaxTokensForVariant(variant);
            const pasteTarget = resolveEditableTarget(event.target);
            void runCopyAction(provider, maxTokens, pasteTarget);
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            setModifierPressed(event.code, false);
        };

        const handleBlur = () => {
            resetModifierState();
        };

        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyUp, true);
        window.addEventListener('blur', handleBlur, true);
    },
});
