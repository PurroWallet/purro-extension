// Content Script - Injected into web pages to provide wallet functionality

// Types (inline to avoid imports)
interface Message {
    type: string;
    data?: any;
    requestId?: string;
}

interface MessageResponse {
    success: boolean;
    data?: any;
    error?: string;
    requestId?: string;
}

// Mark that content script has been injected to avoid double injection
(window as any).purroContentScriptInjected = true;

// Inject the provider script into the page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injectedProviderBundle.js');
script.type = 'module';
script.onload = function () {
    // Remove the script element after injection
    if (script.parentNode) {
        script.parentNode.removeChild(script);
    }
};
(document.head || document.documentElement).appendChild(script);

// Inline sendGenericMessage function to avoid complex imports
function sendGenericMessage(type: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const requestId = Date.now().toString();
        const message: Message = { type, data, requestId };

        chrome.runtime.sendMessage(message, (response: MessageResponse) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (!response) {
                reject(new Error('No response received'));
                return;
            }

            if (response.success) {
                resolve(response.data);
            } else {
                const error = new Error(response.error || 'Unknown error');
                reject(error);
            }
        });
    });
}

// Listen for messages from the injected provider
window.addEventListener('message', async (event) => {
    // Only accept messages from the same origin
    if (event.source !== window) return;

    // Only handle messages from our provider
    if (event.data.source !== 'purro-provider') return;

    const { type, data, requestId } = event.data;
    console.log(`📨 Content script received message: ${type} with requestId: ${requestId}`);

    try {
        // Forward the message to background script
        console.log(`  - forwarding to background script...`);
        const response = await sendMessageToBackground({
            type,
            data,
            requestId
        });
        console.log(`  - received response from background:`, response);

        // Send response back to the injected provider
        window.postMessage({
            source: 'purro-content-script',
            type: 'RESPONSE',
            requestId,
            response
        }, '*');
        console.log(`  - sent response back to provider`);
    } catch (error) {
        console.error(`❌ Content script error for ${type} with requestId: ${requestId}:`, error);
        // Send error response back to the injected provider
        window.postMessage({
            source: 'purro-content-script',
            type: 'RESPONSE',
            requestId,
            response: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }, '*');
    }
});

// Helper function to send messages to background script
function sendMessageToBackground(message: Message): Promise<MessageResponse> {
    return sendGenericMessage(message.type, message.data).then(
        (data) => ({ success: true, data, requestId: message.requestId }),
        (error) => ({
            success: false,
            error: error.message || 'Communication error',
            requestId: message.requestId
        })
    );
}

// Listen for wallet state changes from background
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === 'WALLET_UNLOCKED') {
        // Notify the injected provider that wallet was unlocked
        window.postMessage({
            source: 'purro-content-script',
            type: 'WALLET_UNLOCKED'
        }, '*');
    } else if (message.type === 'ACCOUNTS_CHANGED') {
        // Notify the injected provider that accounts changed
        window.postMessage({
            source: 'purro-content-script',
            type: 'ACCOUNTS_CHANGED',
            accounts: message.accounts
        }, '*');
    }
});