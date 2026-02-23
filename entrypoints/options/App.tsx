import { useEffect, useState } from "react";

import { Button } from "@/src/components/ui/button";
import {
	getBlackiyaExtensionId,
	getIlmTestApiInstance,
	getTranslationsApiInstance,
	saveBlackiyaExtensionId,
	saveIlmTestApiInstance,
	saveTranslationsApiInstance,
} from "@/src/utils/db";

const App = () => {
	const [ilmTestApiInstance, setIlmTestApiInstance] = useState("");
	const [translationsApiInstance, setTranslationsApiInstance] = useState("");
	const [blackiyaExtensionId, setBlackiyaExtensionId] = useState("");
	const [status, setStatus] = useState("");
	const ilmTestPreviewInstance = ilmTestApiInstance.trim() || "{instance}";
	const translationsPreviewInstance =
		translationsApiInstance.trim() || "{instance}";

	useEffect(() => {
		getIlmTestApiInstance().then(setIlmTestApiInstance);
		getTranslationsApiInstance().then(setTranslationsApiInstance);
		getBlackiyaExtensionId().then(setBlackiyaExtensionId);
	}, []);

	const saveSettings = async () => {
		if (!ilmTestApiInstance.trim()) {
			setStatus("IlmTest API instance is required");
			return;
		}

		if (!translationsApiInstance.trim()) {
			setStatus("Translations API instance is required");
			return;
		}

		if (!blackiyaExtensionId.trim()) {
			setStatus("Blackiya extension ID is required");
			return;
		}

		await saveIlmTestApiInstance(ilmTestApiInstance);
		await saveTranslationsApiInstance(translationsApiInstance);
		await saveBlackiyaExtensionId(blackiyaExtensionId);
		setStatus("Settings saved");
	};

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-8">
			<header className="space-y-2">
				<h1 className="text-2xl font-semibold">Extendo Settings</h1>
				<p className="text-sm text-muted-foreground">
					Configure API instances and Blackiya extension integration used by
					URL/content queries, translation POST, and compilation copy.
				</p>
			</header>

			<section className="space-y-3 rounded-lg border bg-card p-4">
				<label className="text-sm font-medium" htmlFor="ilmtest-api-instance">
					IlmTest API Instance
				</label>
				<input
					className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/50 focus-visible:ring-[3px]"
					id="ilmtest-api-instance"
					onChange={(event) => setIlmTestApiInstance(event.target.value)}
					placeholder="https://host.com/api_path"
					type="text"
					value={ilmTestApiInstance}
				/>
				<p className="text-xs text-muted-foreground">
					URL lookup: {ilmTestPreviewInstance}/entries.php?url={"{"}url{"}"}
				</p>
				<p className="text-xs text-muted-foreground">
					Content lookup: {ilmTestPreviewInstance}/entries.php?query={"{"}
					string_array{"}"}
				</p>
			</section>

			<section className="space-y-3 rounded-lg border bg-card p-4">
				<label className="text-sm font-medium" htmlFor="blackiya-extension-id">
					Blackiya Extension ID
				</label>
				<input
					className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/50 focus-visible:ring-[3px]"
					id="blackiya-extension-id"
					onChange={(event) => setBlackiyaExtensionId(event.target.value)}
					placeholder="abcdefghijklmnopabcdefghijklmnop"
					type="text"
					value={blackiyaExtensionId}
				/>
				<p className="text-xs text-muted-foreground">
					Used by the content script to connect to the Blackiya External API.
				</p>
			</section>

			<section className="space-y-3 rounded-lg border bg-card p-4">
				<label
					className="text-sm font-medium"
					htmlFor="translations-api-instance"
				>
					Translations API Instance
				</label>
				<input
					className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/50 focus-visible:ring-[3px]"
					id="translations-api-instance"
					onChange={(event) => setTranslationsApiInstance(event.target.value)}
					placeholder="http://localhost:3000/api"
					type="text"
					value={translationsApiInstance}
				/>
				<p className="text-xs text-muted-foreground">
					POST: {translationsPreviewInstance}/translations/{"{"}
					conversation_id{"}"}
				</p>
				<p className="text-xs text-muted-foreground">
					Copy GET:
					{" "}
					{translationsPreviewInstance}
					/compilation/excerpts/shift?provider=openai&maxTokens=7000&preset=default
				</p>
			</section>

			<Button className="w-fit" onClick={saveSettings} type="button">
				Save Settings
			</Button>

			{status ? (
				<p className="text-sm text-muted-foreground">{status}</p>
			) : null}
		</main>
	);
};

export default App;
