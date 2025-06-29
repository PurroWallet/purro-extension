import { PurroEVMProvider } from './providers/evm-provider';
import {
    EIP6963AnnounceProviderEvent,
    EIP6963ProviderDetail
} from './types/evm-provider';

const purroProvider = new PurroEVMProvider();

function announceProvider() {
    const providerDetail: EIP6963ProviderDetail = purroProvider.getProviderDetail();

    const announceEvent: EIP6963AnnounceProviderEvent = new CustomEvent(
        'eip6963:announceProvider',
        {
            detail: providerDetail
        }
    ) as EIP6963AnnounceProviderEvent;

    window.dispatchEvent(announceEvent);
}

window.addEventListener('eip6963:requestProvider', () => {
    announceProvider();
});


announceProvider();

declare global {
    interface Window {
        ethereum?: any;
        purro?: any;
    }
}

if (!window.ethereum) {
    Object.defineProperty(window, 'ethereum', {
        value: purroProvider,
        writable: false,
        configurable: false
    });
}

Object.defineProperty(window, 'purro', {
    value: purroProvider,
    writable: false,
    configurable: false
});


window.addEventListener('load', () => {
    window.dispatchEvent(new Event('ethereum#initialized'));
});


let currentUrl = location.href;
new MutationObserver(() => {
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        setTimeout(announceProvider, 100);
    }
}).observe(document, { subtree: true, childList: true });
