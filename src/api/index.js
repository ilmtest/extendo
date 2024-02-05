export const getEntries = async (queryParams) => {
    const url = new URL(`${import.meta.env.VITE_API_HOST}/entries.php`);

    if (queryParams) {
        url.search = new URLSearchParams(queryParams).toString();
    }

    const response = await fetch(url, { method: 'GET' });
    return response.json();
};

export const ocr = async (host, imageUrl) => {
    const url = new URL(host);
    const search = new URLSearchParams(url.search);
    search.append('url', imageUrl);

    url.search = search;

    const response = await fetch(url, { method: 'GET' });
    return response.json();
};
