import { useState } from 'react';
import useAddressBook from '@/client/hooks/use-address-book';
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import type { Contact } from '@/types/address-book';

interface DeleteContactProps {
  contact: Contact;
  onBack: () => void;
  onSuccess: () => void;
}

const CHAIN_LABELS = {
  eip155: 'EVM',
  solana: 'Solana',
  sui: 'Sui',
  all: 'All Chains',
};

export const DeleteContact = ({
  contact,
  onBack,
  onSuccess,
}: DeleteContactProps) => {
  const { deleteContact } = useAddressBook();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);

    try {
      await deleteContact(contact.id);
      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete contact';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Delete Contact"
        onClose={onBack}
        icon={<ChevronLeft className="size-4 text-white" />}
      />
      <DialogContent>
        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium mb-1">
                Are you sure you want to delete this contact?
              </p>
              <p className="text-xs text-white/60">
                This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white/5 rounded-lg p-4 space-y-2">
            <div>
              <p className="text-xs text-white/40 mb-1">Name</p>
              <p className="text-sm text-white font-medium">{contact.name}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Chain</p>
              <p className="text-sm text-white">
                {CHAIN_LABELS[contact.chain]}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Address</p>
              <p className="text-sm text-white font-mono break-all">
                {formatAddress(contact.address)}
              </p>
            </div>
            {contact.note && (
              <div>
                <p className="text-xs text-white/40 mb-1">Note</p>
                <p className="text-sm text-white/80">{contact.note}</p>
              </div>
            )}
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
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="flex-1 bg-red-500 hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Contact'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};
