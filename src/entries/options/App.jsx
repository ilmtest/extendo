import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

import {
    getContentQueryEndpoint,
    getUrlQueryEndpoint,
    saveContentQueryEndpoint,
    saveUrlQueryEndpoint,
} from '../../utils/db';
import './App.css';

function App() {
    const [urlEndpoint, setUrlEndpoint] = useState('');
    const [contentEndpoint, setContentEndpoint] = useState('');

    useEffect(() => {
        getUrlQueryEndpoint().then(setUrlEndpoint);
        getContentQueryEndpoint().then(setContentEndpoint);
    }, []);

    return (
        <main>
            <h1>Settings</h1>
            <div className="form-container">
                <div className="form-field">
                    <label>URL-Query Endpoint (GET):</label>
                    <input
                        onChange={(e) => setUrlEndpoint(e.target.value)}
                        placeholder="https://host.com/entries?url={{url}}"
                        type="text"
                        value={urlEndpoint}
                    />
                    <button
                        onClick={() => {
                            if (urlEndpoint.includes('{{url}}')) {
                                saveUrlQueryEndpoint(urlEndpoint.trim());
                                toast.success('Saved');
                            } else {
                                toast.error('Endpoint must include {{url}}');
                            }
                        }}
                    >
                        Save
                    </button>
                </div>

                <div className="form-field">
                    <label>Content-Query Endpoint (GET):</label>
                    <input
                        onChange={(e) => setContentEndpoint(e.target.value)}
                        placeholder="https://host.com/entries?text={{text}}&array={{string_array}}"
                        type="text"
                        value={contentEndpoint}
                    />
                    <button
                        onClick={() => {
                            if (contentEndpoint.includes('{{text}}') || contentEndpoint.includes('{{string_array}}')) {
                                saveContentQueryEndpoint(contentEndpoint.trim());
                                toast.success('Saved');
                            } else {
                                toast.error('Endpoint must include {{text}}');
                            }
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
            <Toaster />
        </main>
    );
}

export default App;
