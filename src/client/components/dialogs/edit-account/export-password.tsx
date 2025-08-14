import useWallet from '@/client/hooks/use-wallet';
import React, { useState } from 'react';
import { DialogFooter } from '../../ui/dialog';
import {
  Button,
  DialogContent,
  DialogHeader,
  DialogWrapper,
  InputPassword,
} from '../../ui';

const ExportPassword = ({
  onBack,
  onConfirm,
  description,
}: {
  onBack: () => void;
  onConfirm: (password: string) => void;
  description: string;
}) => {
  const [password, setPassword] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const { unlockWallet } = useWallet();

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (hasError) {
      setHasError(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVerifyPassword();
    }
  };

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setHasError(true);
      return;
    }

    setIsVerifying(true);
    setHasError(false);

    try {
      // Try to unlock wallet with the provided password
      // This will throw an error if password is incorrect
      await unlockWallet(password);

      // If we reach here, password is correct
      onConfirm(password);
    } catch (error) {
      // Password is incorrect
      setHasError(true);
      setPassword(''); // Clear password field on error
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader title="Enter Password" onClose={onBack} />
      <DialogContent>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">{description}</p>
          <InputPassword
            value={password}
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your password"
            hasError={hasError}
          />
          {hasError && (
            <p className="text-sm text-red-500">
              Incorrect password. Please try again.
            </p>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleVerifyPassword}
          disabled={!password.trim() || isVerifying}
          className="w-full"
        >
          Confirm
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ExportPassword;
