// src/data/config.ts

// These come from your environment (set in Vite: VITE_*)
export const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "<YOUR_CLIENT_ID>";

// The redirect URL (can be set in env or defaults to current origin + /api/callback)
export const REDIRECT_URI =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/api/callback`;
