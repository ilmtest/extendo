import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { getEntries } from '../../api';
import { popEntryResults } from '../../utils/db';
import { log } from '../../utils/logger';

import './App.css';

const ENTRY_URL_PREFIX = import.meta.env.VITE_API_ENTRY_URL;

const truncate = (val, n = 150) => (val.length > n ? `${val.substr(0, n - 1)}…` : val);

const getCurrentTab = async () => {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    return tab;
};

const sanitizeURL = (url) => {
    const parsedUrl = new URL(url);
    let cleanedURL = parsedUrl.hostname + parsedUrl.pathname.replace(/\/+$/, '');

    if (parsedUrl.search) {
        cleanedURL += parsedUrl.search;
    }

    return cleanedURL;
};

const App = () => {
    const [entries, setEntries] = useState([]);
    const [url, setUrl] = useState('');

    const lookupCurrentTabURL = async () => {
        log('getEntries::url', url);
        browser.action.setBadgeText({ text: '…' });
        const data = await getEntries({ url });

        browser.action.setBadgeText({ text: data.length.toString() });
        browser.action.setBadgeBackgroundColor({ color: '#777777' });
        setEntries(data);
    };

    useEffect(() => {
        getCurrentTab().then((tab) => {
            const tabUrl = tab.url ? sanitizeURL(tab.url) : '';

            setUrl(tabUrl.endsWith('/') ? tabUrl.slice(0, -1) : tabUrl);
        });

        popEntryResults().then(setEntries);
    }, []);

    return (
        <main>
            <div>
                <textarea onChange={(e) => setUrl(e.target.value)} rows="5" style={{ width: '100%' }} value={url} />
                <button disabled={!url} onClick={lookupCurrentTabURL} type="button">
                    Query
                </button>
                {url.includes('%') && (
                    <button onClick={() => setUrl(decodeURIComponent(url))} type="button">
                        Decode
                    </button>
                )}
                {(url.startsWith('http') || url.startsWith('www')) && (
                    <button
                        onClick={() => {
                            setUrl(url.replace(/(https?:\/\/)?(www\.)?/, ''));
                        }}
                        type="button"
                    >
                        Remove Protocol
                    </button>
                )}
                {entries && (
                    <ul>
                        {entries.map(({ body, id }) => {
                            return (
                                <li key={`entry-${id}`}>
                                    <a href={`${ENTRY_URL_PREFIX}/${id}`} rel="noreferrer" target="_blank" title={body}>
                                        [{id}]: {body ? truncate(body) : '?'}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </main>
    );
};

export default App;
