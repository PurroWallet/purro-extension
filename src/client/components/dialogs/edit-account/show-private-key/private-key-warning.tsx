import {
  DialogFooter,
  DialogHeader,
  DialogWrapper,
  HoldButton,
} from '@/client/components/ui';

const PrivateKeyWarning = ({
  onConfirm,
  onBack,
}: {
  onConfirm: () => void;
  onBack: () => void;
}) => {
  return (
    <DialogWrapper>
      <DialogHeader title="Warning" onClose={onBack} />
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <h2 className="font-semibold text-red-300 mb-2">
              ⚠️ Your Private Key Controls Your Assets
            </h2>
            <p className="text-sm text-red-200 mb-3">
              Your private key is the cryptographic proof of ownership for your
              wallet. Anyone with access to your private key has complete
              control over your assets.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-semibold text-white mb-2">🚫 NEVER DO:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>
                  • Share your private key with anyone under any circumstances
                </li>
                <li>• Store it in plain text on your computer or phone</li>
                <li>• Copy and paste it into untrusted applications</li>
                <li>
                  • Send it via email, messages, or any communication platform
                </li>
                <li>• Take screenshots or photos of your private key</li>
                <li>• Enter it on suspicious websites or phishing sites</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-white mb-2">✅ ALWAYS DO:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Keep it encrypted and password-protected</li>
                <li>• Store backups in secure, offline locations</li>
                <li>• Use hardware wallets for long-term storage</li>
                <li>
                  • Verify the authenticity of any application requesting it
                </li>
                <li>• Only import it into trusted wallet applications</li>
                <li>
                  • Consider using multi-signature wallets for large amounts
                </li>
              </ul>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-300 mb-2">
                💡 Critical Security Facts:
              </h3>
              <ul className="text-sm text-yellow-200 space-y-1">
                <li>
                  • Private key = instant access to all funds in the wallet
                </li>
                <li>
                  • Compromised private key = immediate risk of asset theft
                </li>
                <li>• No way to change or reset a private key once created</li>
                <li>
                  • Transactions signed with private keys are irreversible
                </li>
              </ul>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-200">
                <strong>Security Tip:</strong> If you suspect your private key
                has been compromised, immediately transfer all assets to a new
                wallet with a fresh private key. Time is critical in such
                situations.
              </p>
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <HoldButton onConfirm={onConfirm} />
      </DialogFooter>
    </DialogWrapper>
  );
};

export default PrivateKeyWarning;
