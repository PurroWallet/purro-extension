import {
  ArrowUpRightIcon,
  FileKey2,
  FileLock,
  IdCard,
  ListOrdered,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { DialogContent, DialogHeader } from '../../ui';
import useWalletStore from '@/client/hooks/use-wallet-store';
import useWallet from '@/client/hooks/use-wallet';
import { useEffect, useState } from 'react';
import { SeedPhraseData } from '@/background/types/account';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useEditAccountStore from '@/client/hooks/use-edit-account-store';
import { AccountIcon } from '../../account';
import { Menu } from '../../ui/menu';
import {
  getHLNameByAddress,
  getHLProfileByAddress,
  HLProfile,
} from '@/client/services/hyperliquid-name-api';
import { HlNameIcon } from '@/assets/icon-component/hl-name-icon';

// Constants for easy customization
const HL_NAME_LABEL = 'HL Name';

interface MainEditAccountProps {
  onEditIcon: () => void;
  onEditName: () => void;
  onShowSeedPhrase: () => void;
  onShowPrivateKey: () => void;
  onRemoveAccount: () => void;
}

const MainEditAccount = ({
  onEditIcon,
  onEditName,
  onShowSeedPhrase,
  onShowPrivateKey,
  onRemoveAccount,
}: MainEditAccountProps) => {
  const { closeDialog } = useDialogStore();
  const { accounts, getAccountWalletObject } = useWalletStore();
  const { selectedAccountId } = useEditAccountStore();
  const { getSeedPhraseById } = useWallet();
  const account = accounts.find(account => account.id === selectedAccountId);
  const accountWallet = selectedAccountId
    ? getAccountWalletObject(selectedAccountId)
    : null;
  const isWatchOnly = account?.source === 'watchOnly';
  const [seedPhrase, setSeedPhrase] = useState<SeedPhraseData | null>(null);
  const [hlName, setHlName] = useState<string | null>(null);
  const [hlProfile, setHlProfile] = useState<HLProfile | null>(null);

  // Get the first available address from the wallet object
  const accountAddress =
    accountWallet?.eip155?.address ||
    accountWallet?.solana?.address ||
    accountWallet?.sui?.address;

  // Fetch HL name and profile if account has an address
  useEffect(() => {
    let isMounted = true;
    if (accountAddress) {
      // Fetch both name and profile data
      Promise.all([
        getHLNameByAddress(accountAddress),
        getHLProfileByAddress(accountAddress),
      ]).then(([name, profile]) => {
        if (isMounted) {
          setHlName(name);
          setHlProfile(profile);
        }
      });
    } else {
      setHlName(null);
      setHlProfile(null);
    }
    return () => {
      isMounted = false;
    };
  }, [accountAddress]);

  useEffect(() => {
    if (account?.source === 'seedPhrase') {
      const fetchSeedPhrase = async () => {
        const seedPhrase = await getSeedPhraseById(account?.seedPhraseId || '');
        setSeedPhrase(seedPhrase);
      };
      fetchSeedPhrase();
    }
  }, [account?.seedPhraseId, account?.source, getSeedPhraseById]);

  return (
    <>
      <DialogHeader
        title="Edit Account"
        onClose={() => closeDialog()}
        icon={<X className="size-4" />}
      />
      <DialogContent className="items-center">
        <div className="flex items-center justify-center size-24 bg-[var(--card-color)] rounded-full relative">
          <AccountIcon
            icon={account?.icon}
            alt="Account"
            className="size-full text-6xl"
          />
          <div className="flex flex-col items-center justify-center absolute bottom-0 right-0">
            <button
              className="flex items-center justify-center size-8 bg-white/30 rounded-full hover:bg-white/20 transition-colors duration-200 cursor-pointer"
              onClick={onEditIcon}
            >
              <Pencil className="size-4 text-white" />
            </button>
          </div>
        </div>

        {/* Show HL avatar availability hint */}
        {hlProfile?.avatar && (
          <div className="flex items-center justify-center gap-2 px-3 py-1 bg-[var(--background-color)]/30 rounded-full">
            <HlNameIcon className="size-4" />
            <p className="text-xs text-gray-400">HL Avatar Available</p>
          </div>
        )}
        <Menu
          items={[
            ...(hlName
              ? [
                  {
                    icon: HlNameIcon,
                    label: HL_NAME_LABEL,
                    description: hlName,
                    arrowLeft: false,
                    arrowLeftIcon: ArrowUpRightIcon,
                    onClick: () => {
                      window.open(
                        `https://app.hlnames.xyz/name/${hlName}`,
                        '_blank'
                      );
                    },
                  },
                ]
              : []),
            {
              icon: IdCard,
              label: 'Name',
              onClick: onEditName,
              description: account?.name,
              arrowLeft: true,
            },
          ]}
        />
        {!isWatchOnly && (
          <Menu
            items={[
              {
                isHidden: !seedPhrase,
                icon: ListOrdered,
                label: 'Recovery Phrase',
                description: seedPhrase?.name,
              },
              {
                isHidden: !seedPhrase,
                icon: FileLock,
                label: 'Show Recovery Phrase',
                onClick: onShowSeedPhrase,
                arrowLeft: true,
              },
              {
                icon: FileKey2,
                label: 'Private Key',
                onClick: onShowPrivateKey,
                arrowLeft: true,
              },
            ]}
          />
        )}
        <Menu
          items={[
            {
              icon: Trash2,
              label: 'Remove Account',
              onClick: onRemoveAccount,
              itemClassName: 'text-red-400',
            },
          ]}
        />
      </DialogContent>
    </>
  );
};

export default MainEditAccount;
