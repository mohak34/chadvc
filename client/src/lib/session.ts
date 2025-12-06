// Session utility for multi-device support
// Each browser tab gets a unique session ID that persists for that tab

const SESSION_KEY = "chadvc-session-id";

// Get or create a session ID for this tab
// Uses sessionStorage so each tab gets its own ID
export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

// Clear the session ID (used on logout)
export function clearSessionId(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
