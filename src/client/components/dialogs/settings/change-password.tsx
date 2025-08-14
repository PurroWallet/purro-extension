import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
  Button,
  InputPassword,
} from '@/client/components/ui';
import { useState } from 'react';
import useWallet from '@/client/hooks/use-wallet';

const ChangePassword = ({ onBack }: { onBack: () => void }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword } = useWallet();

  const validatePasswords = () => {
    if (!currentPassword) {
      setError('Current password is required');
      return false;
    }

    if (!newPassword) {
      setError('New password is required');
      return false;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return false;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return false;
    }

    if (!confirmPassword) {
      setError('Please confirm your new password');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (!validatePasswords()) {
      return;
    }

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully!');

      // Clear form after success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Auto close after 2 seconds
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to change password'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleChangePassword();
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader onClose={onBack} title="Change Password" />
      <DialogContent>
        <div className="space-y-4">
          <div>
            <InputPassword
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCurrentPassword(e.target.value)
              }
              onKeyDown={handleKeyDown}
            />
          </div>

          <div>
            <InputPassword
              placeholder="New Password"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewPassword(e.target.value)
              }
              onKeyDown={handleKeyDown}
            />
          </div>

          <div>
            <InputPassword
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              onKeyDown={handleKeyDown}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-500 text-sm bg-green-500/10 p-3 rounded-lg border border-green-500/20">
              {success}
            </div>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          onClick={handleChangePassword}
          disabled={
            loading || !currentPassword || !newPassword || !confirmPassword
          }
          className="w-full"
        >
          {loading ? 'Changing...' : 'Change Password'}
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ChangePassword;
