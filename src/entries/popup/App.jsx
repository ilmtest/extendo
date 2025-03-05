import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { doGetRequest } from '~/api';

import { getUrlQueryEndpoint, popEntryResults } from '../../utils/db';
import { log } from '../../utils/logger';
import './App.css';

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

    if (cleanedURL.endsWith('/')) {
        cleanedURL = cleanedURL.slice(0, -1);
    }

    return cleanedURL;
};

const App = () => {
    const [entries, setEntries] = useState([]);
    const [url, setUrl] = useState('');

    const lookupCurrentTabURL = async () => {
        const endpoint = await getUrlQueryEndpoint();
        const urlWithQueryParams = endpoint.replace('{{url}}', encodeURIComponent(url));

        log('doGetRequest::url', urlWithQueryParams);
        browser.action.setBadgeText({ text: '…' });

        const data = await doGetRequest(urlWithQueryParams);

        browser.action.setBadgeText({ text: data.length.toString() });
        browser.action.setBadgeBackgroundColor({ color: '#777777' });
        setEntries(data);
    };

    useEffect(() => {
        getCurrentTab().then((tab) => {
            const tabUrl = tab.url ? sanitizeURL(tab.url) : '';
            setUrl(tabUrl);
        });

        popEntryResults().then(setEntries);
    }, []);

    return (
        <main>
            <div className="input-container">
                <textarea className="input-textarea" onChange={(e) => setUrl(e.target.value)} rows="5" value={url} />
                <div className="button-container">
                    <button className="button" disabled={!url} onClick={lookupCurrentTabURL} type="button">
                        Query URL
                    </button>
                    {url.includes('%') && (
                        <button className="button" onClick={() => setUrl(decodeURIComponent(url))} type="button">
                            Decode
                        </button>
                    )}
                    {(url.startsWith('http') || url.startsWith('www')) && (
                        <button
                            className="button"
                            onClick={() => {
                                setUrl(url.replace(/(https?:\/\/)?(www\.)?/, ''));
                            }}
                            type="button"
                        >
                            Remove Protocol
                        </button>
                    )}
                </div>
            </div>
            {entries && (
                <ul className="entry-list">
                    {entries.map((e, i) => {
                        return (
                            <li className="entry-item" key={`entry-${e.id || i}`}>
                                {JSON.stringify(e)}
                            </li>
                        );
                    })}
                </ul>
            )}
        </main>
    );
};

export default App;
