import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { doGetRequest } from '@/src/api';
import { Button } from '@/src/components/ui/button';
import { getIlmTestApiInstance, popEntryResults } from '@/src/utils/db';
import { sanitizeURL } from '@/src/utils/helpers';
import { logError } from '@/src/utils/logger';

const App = () => {
    const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const lookupCurrentTabURL = async () => {
        if (!url || isLoading) {
            return;
        }

        try {
            setIsLoading(true);
            browser.action.setBadgeText({ text: '...' });

            const ilmTestApiInstance = await getIlmTestApiInstance();
            if (!ilmTestApiInstance) {
                browser.action.setBadgeText({ text: '' });
                return;
            }

            const urlWithQueryParams = `${ilmTestApiInstance}/entries.php?url=${encodeURIComponent(url)}`;
            const data = await doGetRequest<Record<string, unknown>[]>(urlWithQueryParams);

            browser.action.setBadgeText({ text: data.length.toString() });
            browser.action.setBadgeBackgroundColor({ color: '#777777' });
            setEntries(data);
        } catch (error) {
            logError('lookupCurrentTabURL failed', error);
            browser.action.setBadgeText({ text: '!' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const loadCurrentTab = async () => {
            const [tab] = await browser.tabs.query({
                active: true,
                lastFocusedWindow: true,
            });
            const tabUrl = tab?.url ? sanitizeURL(tab.url) : '';
            setUrl(tabUrl);
        };

        void loadCurrentTab();

        popEntryResults<Record<string, unknown>[]>().then(setEntries);
    }, []);

    return (
        <main className="w-[440px] space-y-4 p-3">
            <div className="space-y-2">
                <textarea
                    className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/50 focus-visible:ring-[3px]"
                    onChange={(event) => setUrl(event.target.value)}
                    rows={5}
                    value={url}
                />
                <div className="flex flex-wrap gap-2">
                    <Button disabled={!url || isLoading} onClick={lookupCurrentTabURL} type="button">
                        {isLoading ? 'Querying...' : 'Query URL'}
                    </Button>
                    {url.includes('%') ? (
                        <Button onClick={() => setUrl(decodeURIComponent(url))} type="button" variant="secondary">
                            Decode
                        </Button>
                    ) : null}
                    {url.startsWith('http') || url.startsWith('www') ? (
                        <Button
                            onClick={() => setUrl(url.replace(/(https?:\/\/)?(www\.)?/, ''))}
                            type="button"
                            variant="secondary"
                        >
                            Remove Protocol
                        </Button>
                    ) : null}
                </div>
            </div>

            {entries.length > 0 ? (
                <div className="max-h-[360px] overflow-auto rounded-md border bg-card p-2">
                    <ul className="space-y-2">
                        {entries.map((entry, index) => (
                            <li
                                className="break-words rounded border bg-muted/30 p-2 text-xs"
                                key={`entry-${String((entry as { id?: unknown }).id ?? index)}`}
                            >
                                {JSON.stringify(entry)}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </main>
    );
};

export default App;
