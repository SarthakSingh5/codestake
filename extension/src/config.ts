// CodeStake Extension Environment Configuration

export const PRODUCTION_URL = 'https://codestake-zeta.vercel.app';
export const LOCAL_URL = 'http://localhost:3000';

// Use VITE_API_URL if provided in environment, otherwise use PRODUCTION_URL in production builds
// and LOCAL_URL in development mode.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PRODUCTION_URL : LOCAL_URL);

