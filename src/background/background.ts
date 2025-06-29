import './polyfills';
import { MessageHandler } from './message-handler';

export interface MessageRequest {
    type: string;
    data?: any;
    id?: string;
}

export interface MessageResponse {
    success: boolean;
    data?: any;
    error?: string;
    id?: string;
}


class Background {
    private messageHandler: MessageHandler;

    constructor() {
        this.messageHandler = new MessageHandler();
        this.init();
    }

    private init() {
        chrome.runtime.onMessage.addListener((message: MessageRequest, sender, sendResponse) => {
            this.messageHandler.handleMessage(message, sender)
                .then(response => {
                    sendResponse(response);
                })
                .catch(error => {
                    sendResponse({
                        success: false,
                        error: error.message || 'Unknown error occurred',
                        id: message.id
                    });
                });

            return true;
        });

        // Listen for auto-lock alarms
        chrome.alarms.onAlarm.addListener(async (alarm) => {
            if (alarm.name === 'AUTO_LOCK') {
                try {
                    await import('./handlers/auth-handler').then(m => m.authHandler.lock());
                } catch (err) {
                    console.error('Failed to auto-lock wallet:', err);
                }
            }
        });
    }
}

new Background();