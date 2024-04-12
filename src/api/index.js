export const getEntries = async (queryParams) => {
    const url = new URL(`${import.meta.env.VITE_API_HOST}/entries.php`);

    if (queryParams) {
        url.search = new URLSearchParams(queryParams).toString();
    }

    const response = await fetch(url, { method: 'GET' });
    return response.json();
};
