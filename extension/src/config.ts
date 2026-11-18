// CodeStake Extension Environment Configuration

export const PRODUCTION_URL = 'https://codestake-zeta.vercel.app';
export const LOCAL_URL = 'http://localhost:3000';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PRODUCTION_URL : LOCAL_URL);

