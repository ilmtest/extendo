import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const sanitizeURL = (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return '';
    }

    try {
        const parsedUrl = new URL(trimmedValue);
        let cleanedURL = parsedUrl.hostname + parsedUrl.pathname.replace(/\/+$/, '');

        if (parsedUrl.search) {
            cleanedURL += parsedUrl.search;
        }

        if (cleanedURL.endsWith('/')) {
            cleanedURL = cleanedURL.slice(0, -1);
        }

        return cleanedURL;
    } catch {
        return trimmedValue;
    }
};
