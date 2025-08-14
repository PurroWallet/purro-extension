import WalletAddressesSimple from './wallet-addresses-simple';
import { useState } from 'react';
import { GripVertical, Settings } from 'lucide-react';
// import EditAccount from "../dialogs/edit-account/edit-account";
import { cn } from '@/client/lib/utils';
import useEditAccountStore from '@/client/hooks/use-edit-account-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useWallet from '@/client/hooks/use-wallet';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { AccountIcon, AccountName } from '../account';
import EditAccount from '../dialogs/edit-account';

const AccountList = () => {
  const { reorderAccounts, setActiveAccount } = useWallet();
  const { accounts, activeAccount, wallets } = useWalletStore();
  const { setSelectedAccountId } = useEditAccountStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedAccounts] = useState<Set<string>>(new Set());
  const [hoveredAccount, setHoveredAccount] = useState<string | null>(null);
  const { openDialog } = useDialogStore();

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    // Add a slight delay to prevent immediate opacity change
    setTimeout(() => {
      (e.currentTarget as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Only set drag over index if it's different from dragged index
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear drag over index if we're leaving the container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    dropIndex: number
  ) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Create new order array
    const newAccounts = [...accounts];
    const draggedAccount = newAccounts[draggedIndex];

    // Remove dragged item
    newAccounts.splice(draggedIndex, 1);

    // Insert at new position
    newAccounts.splice(dropIndex, 0, draggedAccount);

    // Get ordered IDs
    const orderedIds = newAccounts.map(account => account.id);

    try {
      await reorderAccounts(orderedIds);
    } catch (error) {
      console.error('Failed to reorder accounts:', error);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAccountClick = async (accountId: string) => {
    // Don't switch account if we're in the middle of dragging
    if (draggedIndex !== null) return;

    try {
      await setActiveAccount(accountId);
    } catch (error) {
      console.error('Failed to switch account:', error);
    }
  };

  const isConnect = window.location.pathname.includes('connect.html');

  return (
    <div className="flex flex-col gap-2">
      {accounts.map((account, index) => {
        const isActive = activeAccount?.id === account.id;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index && draggedIndex !== index;
        const isExpanded = expandedAccounts.has(account.id);
        const isHovered = hoveredAccount === account.id;
        const shouldShowAddresses = isExpanded || isHovered;

        return (
          <div
            key={account.id}
            draggable
            onDragStart={e => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={e => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, index)}
            onMouseEnter={() => setHoveredAccount(account.id)}
            onMouseLeave={() => setHoveredAccount(null)}
            className={`transition-all duration-300 ease-in-out rounded-lg p-2 cursor-pointer group relative ${
              isActive
                ? 'bg-[var(--primary-color)] border border-[var(--primary-color)]/10'
                : 'bg-[var(--background-color)] hover:bg-[var(--background-color)]/80'
            } ${
              isDragOver
                ? 'border-2 border-[var(--primary-color)] border-dashed bg-[var(--primary-color)]/10 transform scale-105'
                : ''
            } ${isDragging ? 'opacity-50 transform rotate-2 scale-95' : ''}`}
          >
            {/* Main account row */}
            <div
              className="flex items-center gap-2"
              onClick={() => handleAccountClick(account.id)}
            >
              {/* Drag handle */}
              {!isConnect && (
                <div className="opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0">
                  <GripVertical className="size-4 text-gray-400" />
                </div>
              )}

              {/* Account icon */}
              <div className="size-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <AccountIcon icon={account.icon} alt="Account" />
              </div>

              {/* Account name */}
              <AccountName name={account.name} className="text-base flex-1" />

              {/* Settings button - positioned on the right */}
              {!isConnect && (
                <button
                  className={cn(
                    'flex items-center justify-center gap-2 transition-transform duration-200 hover:bg-white/10 rounded-full p-2 cursor-pointer ml-auto',
                    isHovered ? 'block' : 'hidden'
                  )}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedAccountId(account.id);
                    openDialog(<EditAccount />);
                  }}
                >
                  <Settings className="size-4 transition-transform duration-200" />
                </button>
              )}
            </div>

            {/* Wallet addresses - positioned below account row when expanded or hovered */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                shouldShowAddresses
                  ? 'max-h-96 opacity-100 mt-2'
                  : 'max-h-0 opacity-0 mt-0'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div
                className={`transform transition-transform duration-300 ease-in-out ${
                  shouldShowAddresses ? 'translate-y-0' : '-translate-y-2'
                }`}
              >
                {(() => {
                  const wallet = wallets[account.id];

                  // Transform wallet data to the structure expected by WalletAddressesSimple
                  const transformedWallets = {
                    ethereum: {
                      address: wallet?.eip155?.address || '',
                      publicKey:
                        typeof wallet?.eip155?.publicKey === 'string'
                          ? wallet?.eip155?.publicKey
                          : (wallet?.eip155?.publicKey as any)?.data || '',
                    },
                    solana: {
                      publicKey:
                        typeof wallet?.solana?.publicKey === 'string'
                          ? wallet?.solana?.publicKey
                          : (wallet?.solana?.publicKey as any)?.data || '',
                    },
                    sui: {
                      publicKey:
                        typeof wallet?.sui?.publicKey === 'string'
                          ? wallet?.sui?.publicKey
                          : (wallet?.sui?.publicKey as any)?.data || '',
                    },
                  };

                  return <WalletAddressesSimple wallets={transformedWallets} />;
                })()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AccountList;
