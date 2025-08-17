// Constants for easy customization
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const ERROR_MESSAGES = {
  NO_RESPONSE: 'No response received',
  UNKNOWN_ERROR: 'Unknown error',
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendMessage = async (type: string, data?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const message = { type, data, requestId: Date.now().toString() };

    // Set timeout for the request
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${DEFAULT_TIMEOUT_MS}ms`));
    }, DEFAULT_TIMEOUT_MS);

    chrome.runtime.sendMessage(message, response => {
      clearTimeout(timeoutId);

      if (chrome.runtime.lastError) {
        reject(
          new Error(
            chrome.runtime.lastError.message || ERROR_MESSAGES.UNKNOWN_ERROR
          )
        );
        return;
      }

      if (!response) {
        reject(new Error(ERROR_MESSAGES.NO_RESPONSE));
        return;
      }

      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || ERROR_MESSAGES.UNKNOWN_ERROR));
      }
    });
  });
};

// Export config for customization
export const MESSAGE_CONFIG = {
  TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
  ERROR_MESSAGES,
} as const;
