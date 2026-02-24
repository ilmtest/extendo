import { describe, expect, it } from 'bun:test';
import { injectTextViaPaste, resolveEditableTarget } from '@/src/content/paste-target';

describe('content/paste-target', () => {
    it('should resolve textarea as editable target', () => {
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        expect(resolveEditableTarget(textarea)).toBe(textarea);
    });

    it('should resolve custom role textbox target via closest', () => {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('role', 'textbox');
        const child = document.createElement('span');
        wrapper.appendChild(child);
        document.body.appendChild(wrapper);

        expect(resolveEditableTarget(child)).toBe(wrapper);
    });

    it('should insert text into textarea when synthetic paste is not handled', () => {
        const textarea = document.createElement('textarea');
        textarea.value = 'abc';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.setSelectionRange(1, 2);

        const inputEvents: string[] = [];
        textarea.addEventListener('input', () => inputEvents.push('input'));
        textarea.addEventListener('change', () => inputEvents.push('change'));

        const result = injectTextViaPaste(textarea, 'XYZ');
        expect(result).toBeTrue();
        expect(textarea.value).toBe('aXYZc');
        expect(inputEvents).toEqual(['input', 'change']);
    });

    it('should stop after paste event when target handles paste', () => {
        const div = document.createElement('div');
        div.setAttribute('contenteditable', 'true');
        div.textContent = 'seed';
        document.body.appendChild(div);

        div.addEventListener('paste', (event) => {
            event.preventDefault();
            div.textContent = 'handled';
        });

        const result = injectTextViaPaste(div, 'ignored');
        expect(result).toBeTrue();
        expect(div.textContent).toBe('handled');
    });
});
