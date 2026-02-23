import { describe, expect, test } from "bun:test";

import {
	buildCompilationEndpoint,
	getMaxTokensForVariant,
	getProviderFromUrl,
	isBlackiyaConversationEvent,
} from "@/src/background/utils";

describe("background utils", () => {
	test("getMaxTokensForVariant returns mapped values", () => {
		expect(getMaxTokensForVariant("leftCommandLeftOption0")).toBe(10000);
		expect(getMaxTokensForVariant("rightCommandRightOption0")).toBe(20000);
		expect(getMaxTokensForVariant("leftCommandLeftOption7")).toBe(7000);
		expect(getMaxTokensForVariant("rightCommandRightOption5")).toBe(15000);
	});

	test("getProviderFromUrl resolves providers from hostnames", () => {
		expect(getProviderFromUrl("https://chatgpt.com/c/123")).toBe("openai");
		expect(getProviderFromUrl("https://chat.openai.com/chat")).toBe("openai");
		expect(getProviderFromUrl("https://x.com/i/grok")).toBe("grok");
		expect(getProviderFromUrl("https://grok.com/chat")).toBe("grok");
		expect(getProviderFromUrl("https://gemini.google.com/app")).toBe("gemini");
	});

	test("getProviderFromUrl falls back to openai", () => {
		expect(getProviderFromUrl("https://example.com")).toBe("openai");
		expect(getProviderFromUrl("not-a-url")).toBe("openai");
		expect(getProviderFromUrl()).toBe("openai");
	});

	test("buildCompilationEndpoint creates provider and maxTokens query params", () => {
		const endpoint = buildCompilationEndpoint(
			"https://api.example.com",
			"grok",
			15000,
		);
		expect(endpoint).toBe(
			"https://api.example.com/compilation/excerpts/shift?provider=grok&maxTokens=15000",
		);
	});

	test("isBlackiyaConversationEvent validates payload shape", () => {
		expect(
			isBlackiyaConversationEvent({
				api: "blackiya.events.v1",
				type: "conversation.ready",
				event_id: "event-1",
				conversation_id: "conv-1",
				payload: { hello: "world" },
			}),
		).toBe(true);

		expect(
			isBlackiyaConversationEvent({
				api: "blackiya.events.v1",
				type: "conversation.updated",
				event_id: "event-1",
				conversation_id: "conv-1",
				payload: { hello: "world" },
			}),
		).toBe(false);

		expect(isBlackiyaConversationEvent(null)).toBe(false);
	});
});
