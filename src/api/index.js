import { log } from '../utils/logger';

export const doGetRequest = async (host, queries = {}) => {
    const url = new URL(host);

    if (Object.keys(queries).length > 0) {
        const search = new URLSearchParams(url.search);

        Object.entries(queries).forEach(([key, value]) => {
            search.append(key, value);
        });

        url.search = search;
    }

    log('Requesting', url);

    const response = await fetch(url, { method: 'GET' });
    return response.json();
};
