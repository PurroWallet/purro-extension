// Offscreen document management - MEMORY ONLY for maximum security
let __offscreenCreated = false;

export const offscreenManager = {
  async hasOffscreenDocument(): Promise<boolean> {
    try {
      const clients = await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      });
      return clients.length > 0;
    } catch {
      return false;
    }
  },

  async createOffscreenDocument(): Promise<void> {
    // Check if already exists
    if (await this.hasOffscreenDocument()) {
      __offscreenCreated = true;
      return;
    }

    try {
      await chrome.offscreen.createDocument({
        url: 'html/offscreen.html',
        reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
        justification:
          'Maintain session state across service worker restarts for security',
      });
      __offscreenCreated = true;

      // Wait for the document to fully initialize
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('Failed to create offscreen document:', error);
      __offscreenCreated = false;
      throw new Error('Unable to initialize secure session storage');
    }
  },

  async closeOffscreenDocument(): Promise<void> {
    if (!(await this.hasOffscreenDocument())) {
      __offscreenCreated = false;
      return;
    }

    try {
      await chrome.offscreen.closeDocument();
      __offscreenCreated = false;
    } catch (error) {
      console.warn('Failed to close offscreen document:', error);
    }
  },

  // Secure communication with offscreen document - NO FALLBACK
  async sendToOffscreen(action: string, data?: any): Promise<any> {
    // Ensure offscreen document exists
    if (!(await this.hasOffscreenDocument())) {
      await this.createOffscreenDocument();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error('Secure session storage timeout - please unlock again')
        );
      }, 8000);

      chrome.runtime.sendMessage(
        {
          type: 'OFFSCREEN_SESSION',
          action,
          data,
        },
        response => {
          clearTimeout(timeout);

          if (chrome.runtime.lastError) {
            console.error(
              'Secure session communication error:',
              chrome.runtime.lastError
            );
            reject(
              new Error(
                'Secure session storage unavailable - please unlock again'
              )
            );
          } else if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      );
    });
  },
};
