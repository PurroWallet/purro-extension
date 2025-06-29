export const sendMessage = async (type: string, data?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        const message = { type, data, requestId: Date.now().toString() };

        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (!response) {
                reject(new Error("No response received"));
                return;
            }

            if (response.success) {
                resolve(response.data);
            } else {
                reject(new Error(response.error || "Unknown error"));
            }
        });
    });
};