import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { getEntries } from '../../api';
import { ENTRY_LOOKUP_RESULTS_KEY, OCR_RESULTS_KEY } from '../../utils/constants';
import { log } from '../../utils/logger';
import { removeValue } from '../../utils/state';

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
    const [isRTL, setIsRTL] = useState(false);

    useEffect(() => {
        browser.storage.local.get([ENTRY_LOOKUP_RESULTS_KEY, OCR_RESULTS_KEY]).then((records) => {
            if (records[ENTRY_LOOKUP_RESULTS_KEY]?.length > 0) {
                setEntries(records[ENTRY_LOOKUP_RESULTS_KEY]);
                removeValue(ENTRY_LOOKUP_RESULTS_KEY);
            } else if (records[OCR_RESULTS_KEY]?.text) {
                setUrl(records[OCR_RESULTS_KEY].text);
                setIsRTL(true);
                removeValue(OCR_RESULTS_KEY);
            } else {
                getCurrentTab().then((tab) => {
                    if (tab?.url) {
                        setUrl(sanitizeURL(tab.url));
                    }
                });
            }
        });
    }, []);

    const lookupCurrentTabURL = async () => {
        const tab = await getCurrentTab();

        if (tab?.url) {
            log('getEntries::url', url);
            browser.action.setBadgeText({ text: '…' });
            const data = await getEntries({ url });

            browser.action.setBadgeText({ text: data.length.toString() });
            browser.action.setBadgeBackgroundColor({ color: '#777777' });
            setEntries(data);
        }
    };

    return (
        <main>
            <div>
                <textarea
                    dir={isRTL ? 'rtl' : undefined}
                    onChange={(e) => setUrl(e.target.value)}
                    rows="5"
                    style={{ width: '100%' }}
                    value={url}
                />
                <button onClick={lookupCurrentTabURL} type="button">
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
