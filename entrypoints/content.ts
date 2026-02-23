import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { Toaster, toast } from "sonner";
import "sonner/dist/styles.css";
import { browser } from "wxt/browser";
import { getMaxTokensForVariant, getProviderFromUrl } from "@/src/background/utils";
import type { LLMProvider, TokenVariant } from "@/src/background/types";

const SONNER_ROOT_ID = "extendo-sonner-root";
let sonnerRoot: Root | null = null;

type CompilationFetchResponse =
	| { ok: true; text: string }
	| { ok: false; error: string };

const wait = async (ms: number) =>
	new Promise<void>((resolve) => {
		window.setTimeout(resolve, ms);
	});

type Side = "left" | "right" | null;

type ModifierState = {
	metaSide: Side;
	altSide: Side;
};

type ModifierCode = "MetaLeft" | "MetaRight" | "AltLeft" | "AltRight";

type ModifierDescriptor = {
	key: keyof ModifierState;
	side: Exclude<Side, null>;
};

const modifiers: ModifierState = {
	metaSide: null,
	altSide: null,
};

const MODIFIER_CODE_MAP: Record<ModifierCode, ModifierDescriptor> = {
	MetaLeft: { key: "metaSide", side: "left" },
	MetaRight: { key: "metaSide", side: "right" },
	AltLeft: { key: "altSide", side: "left" },
	AltRight: { key: "altSide", side: "right" },
};

const setModifierSide = (code: string, isPressed: boolean) => {
	const modifier = MODIFIER_CODE_MAP[code as ModifierCode];
	if (!modifier) {
		return;
	}

	const { key, side } = modifier;
	modifiers[key] = isPressed ? side : modifiers[key] === side ? null : modifiers[key];
};

const isEditableTarget = (target: EventTarget | null) => {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	if (target.isContentEditable) {
		return true;
	}

	return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
};

const getVariantFromKeyboardEvent = (event: KeyboardEvent): TokenVariant | null => {
	if (!event.metaKey || !event.altKey) {
		return null;
	}

	if (event.code === "Digit0" && modifiers.metaSide === "left" && modifiers.altSide === "left") {
		return "leftCommandLeftOption0";
	}

	if (event.code === "Digit0" && modifiers.metaSide === "right" && modifiers.altSide === "right") {
		return "rightCommandRightOption0";
	}

	if (event.code === "Digit7" && modifiers.metaSide === "left" && modifiers.altSide === "left") {
		return "leftCommandLeftOption7";
	}

	if (event.code === "Digit5" && modifiers.metaSide === "right" && modifiers.altSide === "right") {
		return "rightCommandRightOption5";
	}

	return null;
};

const copyTextToClipboard = async (value: string) => {
	if (navigator.clipboard?.writeText) {
		if (!document.hasFocus()) {
			window.focus();
			await wait(120);
		}

		try {
			await navigator.clipboard.writeText(value);
			return;
		} catch (error) {
			console.warn("Clipboard API write failed, using fallback copy", error);
		}
	}

	const textarea = document.createElement("textarea");
	textarea.value = value;
	textarea.setAttribute("readonly", "true");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	textarea.style.pointerEvents = "none";
	(document.body ?? document.documentElement).appendChild(textarea);
	textarea.select();

	const copied = document.execCommand("copy");
	textarea.remove();

	if (!copied) {
		throw new Error("Clipboard write failed");
	}
};

const ensureToaster = () => {
	if (document.getElementById(SONNER_ROOT_ID) && sonnerRoot) {
		return;
	}

	const mountNode = document.createElement("div");
	mountNode.id = SONNER_ROOT_ID;
	document.documentElement.appendChild(mountNode);

	sonnerRoot = createRoot(mountNode);
	flushSync(() => {
		sonnerRoot?.render(
			createElement(Toaster, {
				position: "top-right",
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

const showToast = (message: string, variant: "success" | "error" = "success") => {
	ensureToaster();

	if (variant === "error") {
		toast.error(message);
		return;
	}

	toast.success(message);
};

const runCopyAction = async (provider: LLMProvider, maxTokens: number) => {
	try {
		const response = (await browser.runtime.sendMessage({
			type: "fetch-compilation-excerpt",
			provider,
			maxTokens,
		})) as CompilationFetchResponse | undefined;

		if (!response?.ok) {
			throw new Error(response?.error ?? "Failed to fetch compilation excerpt");
		}

		const content = response.text;
		await copyTextToClipboard(content);
		showToast(`Copied ${maxTokens.toLocaleString()} tokens to clipboard`);
		console.info("Extendo: excerpt copied to clipboard");
	} catch (error) {
		showToast("Copy failed", "error");
		console.error("Failed to copy excerpt", error);
	}
};

export default defineContentScript({
	matches: ["<all_urls>"],
	runAt: "document_idle",
	main: () => {
		ensureToaster();

		const handleKeyDown = (event: KeyboardEvent) => {
			setModifierSide(event.code, true);

			if (event.repeat || isEditableTarget(event.target)) {
				return;
			}

			const variant = getVariantFromKeyboardEvent(event);
			if (!variant) {
				return;
			}

			event.preventDefault();
			const provider = getProviderFromUrl(window.location.href);
			const maxTokens = getMaxTokensForVariant(variant);
			void runCopyAction(provider, maxTokens);
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			setModifierSide(event.code, false);
		};

		window.addEventListener("keydown", handleKeyDown, true);
		window.addEventListener("keyup", handleKeyUp, true);
		window.addEventListener(
			"blur",
			() => {
				modifiers.metaSide = null;
				modifiers.altSide = null;
			},
			true,
		);
	},
});
