import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const sanitizeURL = (value: string) => {
    const parsedUrl = new URL(value);
    let cleanedURL = parsedUrl.hostname + parsedUrl.pathname.replace(/\/+$/, '');

    if (parsedUrl.search) {
        cleanedURL += parsedUrl.search;
    }

    if (cleanedURL.endsWith('/')) {
        cleanedURL = cleanedURL.slice(0, -1);
    }

    return cleanedURL;
};
