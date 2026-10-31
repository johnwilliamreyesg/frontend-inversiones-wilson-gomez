const TOKEN_KEY = 'loanApp.token';

/**
 * Keeps the session token in localStorage so the session survives a page
 * reload. Wrapped in try/catch: storage can be blocked (private mode).
 */
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Session will last only until the page is closed.
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing to clear.
    }
  },
};
