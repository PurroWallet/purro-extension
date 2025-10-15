import { useState } from 'react';
import useAddressBook from '@/client/hooks/use-address-book';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui/dialog';
import { Button, Input } from '@/client/components/ui';
import { ChevronLeft } from 'lucide-react';
import type { Contact } from '@/types/address-book';
import { evmWalletKeyUtils } from '@/background/utils/keys';

interface AddEditContactProps {
  contact: Contact | null; // null for add, Contact for edit
  onBack: () => void;
  onSuccess: () => void;
}

const CHAIN_OPTIONS = [
  { value: 'eip155', label: 'EVM (Ethereum, Base, Arbitrum, etc.)' },
  { value: 'solana', label: 'Solana' },
  { value: 'sui', label: 'Sui' },
  { value: 'all', label: 'All Chains' },
] as const;

export const AddEditContact = ({
  contact,
  onBack,
  onSuccess,
}: AddEditContactProps) => {
  const { addContact, updateContact } = useAddressBook();
  const isEditing = !!contact;

  const [name, setName] = useState(contact?.name || '');
  const [address, setAddress] = useState(contact?.address || '');
  const [chain, setChain] = useState<'eip155' | 'solana' | 'sui' | 'all'>(
    contact?.chain || 'eip155'
  );
  const [note, setNote] = useState(contact?.note || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateAddress = (addr: string, selectedChain: string): boolean => {
    if (!addr) return false;

    if (selectedChain === 'all') {
      // For 'all', try to validate as EVM first (most common)
      return evmWalletKeyUtils.isValidAddress(addr);
    }

    try {
      switch (selectedChain) {
        case 'eip155':
          return evmWalletKeyUtils.isValidAddress(addr);
        case 'solana':
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
        case 'sui':
          return /^0x[a-fA-F0-9]{64}$/.test(addr);
        default:
          return false;
      }
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Contact name is required');
      return;
    }

    if (!address.trim()) {
      setError('Address is required');
      return;
    }

    if (!validateAddress(address, chain)) {
      setError(`Invalid ${chain === 'all' ? 'EVM' : chain} address format`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && contact) {
        await updateContact({
          id: contact.id,
          name: name.trim(),
          address: address.trim(),
          chain,
          note: note.trim() || undefined,
        });
      } else {
        await addContact({
          name: name.trim(),
          address: address.trim(),
          chain,
          note: note.trim() || undefined,
        });
      }
      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save contact';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAddressValid = address ? validateAddress(address, chain) : true;

  return (
    <DialogWrapper>
      <DialogHeader
        title={isEditing ? 'Edit Contact' : 'Add Contact'}
        onClose={onBack}
        icon={<ChevronLeft className="size-4 text-white" />}
      />
      <DialogContent>
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Contact Name *
            </label>
            <Input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Chain */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Chain *
            </label>
            <select
              value={chain}
              onChange={e =>
                setChain(e.target.value as 'eip155' | 'solana' | 'sui' | 'all')
              }
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)]"
            >
              {CHAIN_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Address *
            </label>
            <Input
              type="text"
              placeholder={
                chain === 'eip155'
                  ? '0x...'
                  : chain === 'solana'
                    ? 'Solana address'
                    : chain === 'sui'
                      ? '0x...'
                      : 'Address'
              }
              value={address}
              onChange={e => setAddress(e.target.value)}
              className={
                address && !isAddressValid
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : ''
              }
            />
            {address && !isAddressValid && (
              <p className="text-xs text-red-400">
                Invalid address format for selected chain
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Note (Optional)
            </label>
            <textarea
              placeholder="Add a note about this contact..."
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] resize-none"
            />
            <p className="text-xs text-white/40 text-right">
              {note.length}/200
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onBack}
              variant="secondary"
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={
                isSubmitting ||
                !name.trim() ||
                !address.trim() ||
                !isAddressValid
              }
            >
              {isSubmitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Contact'
                  : 'Add Contact'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};
