import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { getEntries } from '../../api';
import { ENTRY_LOOKUP_RESULTS_KEY } from '../../utils/constants';
import { log } from '../../utils/logger';
import { getValue, removeValue } from '../../utils/state';

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

    useEffect(() => {
        getValue(ENTRY_LOOKUP_RESULTS_KEY).then((values) => {
            if (values?.length > 0) {
                setEntries(values);
                removeValue(ENTRY_LOOKUP_RESULTS_KEY);
            }
        });
    }, []);

    const lookupCurrentTabURL = async () => {
        const tab = await getCurrentTab();

        if (tab?.url) {
            const url = sanitizeURL(tab.url);
            log('getEntries::url', url);
            const data = await getEntries({ url });

            browser.action.setBadgeText({ text: data.length.toString() });
            browser.action.setBadgeBackgroundColor({ color: '#777777' });
            setEntries(data);
        }
    };

    return (
        <main>
            <div>
                <button onClick={lookupCurrentTabURL} type="button">
                    Query URL
                </button>
                {entries && (
                    <ul>
                        {entries.map(({ body, id }) => {
                            return (
                                <li key={`entry-${id}`}>
                                    <a href={`${ENTRY_URL_PREFIX}/${id}`} rel="noreferrer" target="_blank">
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
