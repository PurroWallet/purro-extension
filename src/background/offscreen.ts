import { SessionData } from './types/storage';

// Session stored in offscreen document memory
let session: SessionData | null = null;

// Secure session cleanup
function secureSessionCleanup() {
  if (session?.password) {
    // Overwrite password multiple times for security
    const len = session.password.length;
    session.password = '0'.repeat(len);
    session.password = '1'.repeat(len);
    session.password = crypto.getRandomValues(new Uint8Array(len)).join('');
    session.password = '';
  }
  session = null;

  // Force garbage collection if available
  if (global.gc) global.gc();
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'OFFSCREEN_SESSION') {
    return false;
  }

  const { action, data } = message;

  try {
    switch (action) {
      case 'GET_SESSION':
        sendResponse(session);
        break;

      case 'SET_SESSION':
        session = data as SessionData;
        sendResponse({ success: true });
        break;

      case 'CLEAR_SESSION':
        secureSessionCleanup();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    sendResponse({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return true; // Keep message channel open for async response
});

// Clean up on window unload
window.addEventListener('beforeunload', () => {
  secureSessionCleanup();
});

// Periodic session validation (optional)
setInterval(() => {
  if (session && session.expiresAt <= Date.now()) {
    secureSessionCleanup();
  }
}, 60000); // Check every minute

// Heartbeat to keep offscreen document alive
setInterval(() => {
  // Just a small operation to prevent the document from being terminated
  Date.now();
}, 30000); // Every 30 seconds
