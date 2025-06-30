import { Copy } from "lucide-react";
import { Button } from "@/client/component/ui";
import { Check } from "lucide-react";
import { useState } from "react";

const PrivateKeyDisplay = ({ privateKey }: { privateKey: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(privateKey);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-base text-gray-300 font-mono break-all bg-gray-900 p-3 rounded-xl border border-gray-600">
          {privateKey}
        </p>

        <Button
          onClick={handleCopy}
          className="w-full flex items-center gap-2 bg-transparent border border-white/20 text-white hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy
            </>
          )}
        </Button>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-yellow-200">
            <strong>Note:</strong> Please backup this private key in a safe and
            offline location
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivateKeyDisplay;
