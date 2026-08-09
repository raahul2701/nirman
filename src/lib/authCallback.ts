const fallbackAppUrl = 'https://nirman.apostolicredeem.com';
const appUrl = import.meta.env.VITE_APP_URL as string | undefined;

export const AUTH_CALLBACK_URL = new URL('/auth/callback', appUrl || fallbackAppUrl).toString();