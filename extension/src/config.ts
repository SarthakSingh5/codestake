// CodeStake Extension Environment Configuration

export const PRODUCTION_URL = 'https://codestake-zeta.vercel.app';
export const LOCAL_URL = 'http://localhost:3000';

// Defaults to LOCAL_URL (http://localhost:3000) for instant local iteration.
// Override with VITE_API_URL when packaging for Chrome Web Store.
export const API_BASE_URL = import.meta.env.VITE_API_URL || LOCAL_URL;

