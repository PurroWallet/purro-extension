import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
  HoldButton,
} from "@/client/components/ui";

const SeedPhraseWarning = ({
  onConfirm,
  onBack,
}: {
  onConfirm: () => void;
  onBack: () => void;
}) => {
  return (
    <DialogWrapper>
      <DialogHeader title="Warning" onClose={onBack} />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <h2 className="font-semibold text-red-300 mb-2">
              ⚠️ Your Seed Phrase is the Key to Your Assets
            </h2>
            <p className="text-sm text-red-200 mb-3">
              Your seed phrase (recovery phrase) is the only way to access and
              recover your wallet. Keeping it secure is absolutely critical.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-semibold text-white mb-2">🚫 NEVER DO:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>
                  • Share your seed phrase with anyone, including friends and
                  family
                </li>
                <li>
                  • Store it on internet-connected devices (email, cloud,
                  screenshots)
                </li>
                <li>• Enter it into untrusted websites or applications</li>
                <li>• Send it via messages, email, or social media</li>
                <li>• Expose it in public places where others can see</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-white mb-2">✅ ALWAYS DO:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Write it down on paper and store in a secure location</li>
                <li>
                  • Create multiple backup copies and store in different
                  locations
                </li>
                <li>• Use a safe or security box for storage</li>
                <li>
                  • Verify the accuracy of your seed phrase before storing
                </li>
                <li>
                  • Only use it when you actually need to recover your wallet
                </li>
              </ul>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-300 mb-2">
                💡 Important Notes:
              </h3>
              <ul className="text-sm text-yellow-200 space-y-1">
                <li>
                  • Anyone with your seed phrase = complete ownership of your
                  wallet
                </li>
                <li>
                  • Lost seed phrase = permanently lost access to all wallet
                  assets
                </li>
                <li>• No way to recover if you forget and have no backup</li>
                <li>• Blockchain transactions cannot be reversed</li>
              </ul>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-200">
                <strong>Recommendation:</strong> Take time to learn about crypto
                wallet security and always implement best security practices.
                Your assets depend on protecting this seed phrase.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <HoldButton onConfirm={onConfirm} />
      </DialogFooter>
    </DialogWrapper>
  );
};

export default SeedPhraseWarning;
