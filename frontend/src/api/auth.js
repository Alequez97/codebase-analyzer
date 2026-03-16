import client from "./client";

/**
 * Sign in with a Google ID token credential.
 * Backend sets an HttpOnly JWT cookie and returns the user object.
 * @param {string} credential - Google ID token from @react-oauth/google
 */
export const signInWithGoogle = (credential) =>
  client.post("/auth/google", { credential }, { withCredentials: true });

/**
 * Re-hydrate auth state from the HttpOnly cookie.
 * Returns the current user if the cookie is valid.
 */
export const getAuthMe = () =>
  client.get("/auth/me", { withCredentials: true });

/**
 * Clear the JWT cookie server-side (log out).
 */
export const logout = () =>
  client.post("/auth/logout", {}, { withCredentials: true });

/**
 * Claim an anonymous session for the currently authenticated user.
 * Cookie is sent automatically.
 * @param {string} sessionId
 */
export const claimSession = (sessionId) =>
  client.post(
    `/market-research/${sessionId}/claim`,
    {},
    { withCredentials: true },
  );
