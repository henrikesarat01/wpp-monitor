// Shared frontend configuration
const DEFAULT_PORT = 8523;

// In dev the app is served over http(s) and window.location provides useful info.
// In production the renderer loads from file:// so hostname is empty — in that
// case, default to localhost so fetch/socket requests go to the bundled backend.
function buildApiUrl() {
  try {
    const { protocol, hostname } = window.location;
    if (!protocol || protocol === "file:") {
      return `http://localhost:${DEFAULT_PORT}`;
    }
    // If running via http/https, preserve the host but force the default port.
    const host = hostname || "localhost";
    return `${protocol}//${host}:${DEFAULT_PORT}`;
  } catch (e) {
    // Fallback
    return `http://localhost:${DEFAULT_PORT}`;
  }
}

export const API_URL = buildApiUrl();

export default {
  API_URL,
};
