// Centralized API configuration for the web client.
// All components should import API_URL from here instead of
// duplicating `import.meta.env.VITE_API_URL ?? 'http://localhost:4000'`.

/**
 * Base URL for the backend API.
 *
 * In development, Vite's proxy forwards /api and /socket.io to the server,
 * so most fetch calls don't need this prefix at all. It's used only when
 * components need to construct absolute URLs (e.g. Socket.io client init).
 *
 * Set VITE_API_URL in .env to override for staging/production builds.
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
