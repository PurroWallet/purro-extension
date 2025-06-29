import { useState, useEffect, useMemo } from "react";
import { Button, Input } from "@/client/component/ui";
import useCreateWalletStore from "@/client/hooks/use-create-wallet-store";
import { cn } from "@/client/lib/utils";

interface VerifyMnemonicProps {
  onNext: () => void;
}

const VerifyMnemonic = ({ onNext }: VerifyMnemonicProps) => {
  const { mnemonic } = useCreateWalletStore();
  const [userInputs, setUserInputs] = useState<string[]>(["", "", ""]);
  const [verificationStatus, setVerificationStatus] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [hasInteracted, setHasInteracted] = useState<boolean[]>([
    false,
    false,
    false,
  ]);

  // Tạo 3 vị trí ngẫu nhiên từ mnemonic
  const randomPositions = useMemo(() => {
    if (!mnemonic) return [];
    const words = mnemonic.split(" ");
    const positions: number[] = [];

    while (positions.length < 3) {
      const randomIndex = Math.floor(Math.random() * words.length);
      if (!positions.includes(randomIndex)) {
        positions.push(randomIndex);
      }
    }

    return positions.sort((a, b) => a - b);
  }, [mnemonic]);

  // Lấy các từ tại vị trí ngẫu nhiên
  const targetWords = useMemo(() => {
    if (!mnemonic) return [];
    const words = mnemonic.split(" ");
    return randomPositions.map((pos) => words[pos]);
  }, [mnemonic, randomPositions]);

  // Kiểm tra xem tất cả các từ đã được verify chưa
  const isAllVerified = useMemo(() => {
    return verificationStatus.every((status) => status);
  }, [verificationStatus]);

  // Xử lý thay đổi input với real-time verification
  const handleInputChange = (index: number, value: string) => {
    const trimmedValue = value.toLowerCase().trim();
    const newInputs = [...userInputs];
    newInputs[index] = trimmedValue;
    setUserInputs(newInputs);

    // Đánh dấu đã tương tác với input này
    const newHasInteracted = [...hasInteracted];
    newHasInteracted[index] = true;
    setHasInteracted(newHasInteracted);

    // Real-time verification
    const newVerificationStatus = [...verificationStatus];
    newVerificationStatus[index] =
      trimmedValue === targetWords[index].toLowerCase();
    setVerificationStatus(newVerificationStatus);
  };

  // Reset khi mnemonic thay đổi
  useEffect(() => {
    setUserInputs(["", "", ""]);
    setVerificationStatus([false, false, false]);
    setHasInteracted([false, false, false]);
  }, [mnemonic]);

  // Xác định trạng thái hiển thị cho từng input
  const getInputStatus = (index: number) => {
    if (!hasInteracted[index] || userInputs[index] === "") {
      return "default"; // Chưa tương tác hoặc rỗng
    }
    return verificationStatus[index] ? "success" : "error";
  };

  if (!mnemonic) {
    return (
      <div className="flex items-center justify-center size-full">
        <p className="text-gray-400">No mnemonic found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-6">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold text-white mb-2 text-center">
            Verify Your Seed Phrase
          </h2>
          <p className="text-gray-400 text-sm text-center mb-6">
            Please enter the following words from your seed phrase to verify
            you've saved it correctly.
          </p>

          <div className="space-y-4">
            {randomPositions.map((position, index) => {
              const status = getInputStatus(index);
              return (
                <div key={position} className="space-y-2">
                  <label className="text-sm text-gray-300 flex items-center gap-2">
                    Word #{position + 1}
                  </label>
                  <Input
                    type="text"
                    value={userInputs[index]}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    placeholder={`Enter word #${position + 1}`}
                    hasError={status === "error"}
                    className={cn(
                      status === "success" &&
                        "border-green-500/50 focus:border-green-500",
                      status === "error" &&
                        "border-red-500/50 focus:border-red-500"
                    )}
                  />
                </div>
              );
            })}
          </div>

          {isAllVerified && (
            <div className="mt-6 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm text-center">
                ✓ All words verified successfully!
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md space-y-3">
        <Button className="w-full" onClick={onNext} disabled={!isAllVerified}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default VerifyMnemonic;
