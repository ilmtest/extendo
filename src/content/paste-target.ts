const INPUT_TYPE_ALLOWLIST = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number']);

const CUSTOM_EDITABLE_SELECTOR = [
    '[contenteditable="true"]',
    '[contenteditable=""]',
    '[role="textbox"]',
    '[data-lexical-editor="true"]',
    '[data-slate-editor="true"]',
    '[data-testid*="composer"]',
].join(', ');

const isTextualInput = (element: HTMLInputElement) => {
    if (element.disabled || element.readOnly) {
        return false;
    }
    const type = (element.type || 'text').toLowerCase();
    return INPUT_TYPE_ALLOWLIST.has(type);
};

export const resolveEditableTarget = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof HTMLElement)) {
        return null;
    }

    if (target instanceof HTMLTextAreaElement && !target.disabled && !target.readOnly) {
        return target;
    }
    if (target instanceof HTMLInputElement && isTextualInput(target)) {
        return target;
    }
    if (target.isContentEditable) {
        return target;
    }

    const custom = target.closest(CUSTOM_EDITABLE_SELECTOR);
    if (custom instanceof HTMLElement) {
        return custom;
    }

    return null;
};

const createDataTransfer = (text: string): DataTransfer | null => {
    try {
        const transfer = new DataTransfer();
        transfer.setData('text/plain', text);
        return transfer;
    } catch {
        return null;
    }
};

const dispatchPasteEvent = (target: HTMLElement, text: string) => {
    const transfer = createDataTransfer(text);
    let event: Event;

    try {
        event = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: transfer ?? undefined,
        });
    } catch {
        event = new Event('paste', { bubbles: true, cancelable: true });
    }

    if (!('clipboardData' in event)) {
        Object.defineProperty(event, 'clipboardData', {
            configurable: true,
            value: transfer,
        });
    }

    target.dispatchEvent(event);
    return event.defaultPrevented;
};

const dispatchInputEvents = (target: HTMLElement) => {
    target.dispatchEvent(
        new InputEvent('input', {
            bubbles: true,
            cancelable: false,
            inputType: 'insertFromPaste',
        }),
    );
    target.dispatchEvent(new Event('change', { bubbles: true }));
};

const insertIntoTextInput = (target: HTMLInputElement | HTMLTextAreaElement, text: string) => {
    const selectionStart = target.selectionStart ?? target.value.length;
    const selectionEnd = target.selectionEnd ?? target.value.length;
    target.setRangeText(text, selectionStart, selectionEnd, 'end');
    dispatchInputEvents(target);
};

const insertIntoContentEditable = (target: HTMLElement, text: string) => {
    target.focus();
    let inserted = false;

    try {
        inserted = document.execCommand('insertText', false, text);
    } catch {
        inserted = false;
    }

    if (!inserted) {
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        if (range && target.contains(range.commonAncestorContainer)) {
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        } else {
            target.append(text);
        }
    }

    dispatchInputEvents(target);
};

export const injectTextViaPaste = (target: HTMLElement, text: string) => {
    if (!text) {
        return false;
    }

    const handledByPaste = dispatchPasteEvent(target, text);
    if (handledByPaste) {
        return true;
    }

    if (target instanceof HTMLTextAreaElement) {
        insertIntoTextInput(target, text);
        return true;
    }

    if (target instanceof HTMLInputElement && isTextualInput(target)) {
        insertIntoTextInput(target, text);
        return true;
    }

    if (target.isContentEditable || target.matches(CUSTOM_EDITABLE_SELECTOR)) {
        insertIntoContentEditable(target, text);
        return true;
    }

    return false;
};
