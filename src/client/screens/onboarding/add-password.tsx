import useCreateWalletStore from '@/client/hooks/use-create-wallet-store';
import usePassword from '@/client/hooks/use-password';
import { Button } from '@/client/components/ui';
import { Eye, EyeOff, Check, X } from 'lucide-react';

const AddPassword = ({ onNext }: { onNext: () => void }) => {
  const { setPassword: setStorePassword } = useCreateWalletStore();
  const {
    password,
    confirmPassword,
    showPassword,
    showConfirmPassword,
    validation,
    isMatching,
    setPassword,
    setConfirmPassword,
    toggleShowPassword,
    toggleShowConfirmPassword,
  } = usePassword();

  const handleSetPassword = () => {
    if (validation.isValid && isMatching) {
      setStorePassword(password);
      onNext();
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStrengthWidth = (score: number) => {
    return `${(score / 6) * 100}%`;
  };

  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">
            Create Password
          </h2>

          <div className="space-y-4">
            {/* Password Input */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] bg-[var(--card-color)] text-white placeholder-gray-400 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={toggleShowPassword}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Password Strength</span>
                    <span
                      className={`font-medium ${
                        validation.strength === 'weak'
                          ? 'text-red-400'
                          : validation.strength === 'medium'
                            ? 'text-yellow-400'
                            : 'text-green-400'
                      }`}
                    >
                      {validation.strength.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(
                        validation.strength
                      )}`}
                      style={{ width: getStrengthWidth(validation.score) }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] bg-[var(--card-color)] text-white placeholder-gray-400 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={toggleShowConfirmPassword}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="flex items-center text-sm">
                  {isMatching ? (
                    <span className="text-green-400 flex items-center">
                      <Check className="size-4 mr-1" />
                      Passwords match
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center">
                      <X className="size-4 mr-1" />
                      Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Password Requirements - Simplified */}
            {password && validation.errors.length > 0 && (
              <div className="bg-[var(--card-color)] rounded-lg p-3 border border-white/10">
                <div className="text-sm text-gray-400 space-y-1">
                  {validation.errors.map((error, index) => (
                    <div key={index} className="flex items-center text-red-400">
                      <span className="mr-2">•</span>
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={!validation.isValid || !isMatching}
        onClick={handleSetPassword}
      >
        Set Password
      </Button>
    </div>
  );
};

export default AddPassword;
