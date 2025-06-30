import {
  ChevronRightIcon,
  FileKey2,
  FileLock,
  IdCard,
  ListOrdered,
  Pencil,
  Trash2,
} from "lucide-react";
import { DialogContent, DialogHeader } from "../../ui";
import useWalletStore from "@/client/hooks/use-wallet-store";
import useWallet from "@/client/hooks/use-wallet";
import { useEffect, useState } from "react";
import { SeedPhraseData } from "@/background/types/account";
import useDialogStore from "@/client/hooks/use-dialog-store";
import useEditAccountStore from "@/client/hooks/use-edit-account-store";
import { AccountIcon } from "../../account";

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
  const { accounts } = useWalletStore();
  const { selectedAccountId } = useEditAccountStore();
  const { getSeedPhraseById } = useWallet();
  const account = accounts.find((account) => account.id === selectedAccountId);
  const isWatchOnly = account?.source === "watchOnly";
  const [seedPhrase, setSeedPhrase] = useState<SeedPhraseData | null>(null);

  if (account?.source === "seedPhrase") {
    useEffect(() => {
      const fetchSeedPhrase = async () => {
        const seedPhrase = await getSeedPhraseById(account?.seedPhraseId || "");
        setSeedPhrase(seedPhrase);
      };
      fetchSeedPhrase();
    }, [account?.seedPhraseId]);
  }

  return (
    <>
      <DialogHeader title="Edit Account" onClose={() => closeDialog()} />
      <DialogContent>
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

        <div className="bg-[var(--card-color)] rounded-lg w-full">
          <button
            className="flex items-center gap-3 pl-4 w-full hover:bg-white/10 transition-colors duration-200 cursor-pointer"
            onClick={onEditName}
          >
            <IdCard className="size-5" />
            <div className={`flex-grow flex items-center gap-3 py-4 pr-4`}>
              <p className="text-base font-medium w-full text-left">Name</p>
              <div className="flex items-center gap-2">
                <p className="text-base text-gray-400 text-right truncate flex-1">
                  {account?.name && account?.name.length > 20
                    ? `${account?.name.substring(0, 20)}...`
                    : account?.name}
                </p>
                <ChevronRightIcon className="size-5" />
              </div>
            </div>
          </button>
        </div>

        {!isWatchOnly && (
          <div className="bg-[var(--card-color)] rounded-lg w-full">
            {seedPhrase && (
              <button className="flex items-center gap-3 pl-4 w-full border-b border-white/10">
                <ListOrdered className="size-5" />
                <div className={`flex-grow flex items-center gap-3 py-4 pr-4`}>
                  <p className="text-base font-medium w-full text-left">
                    Recovery Phrase
                  </p>
                  <div className="flex items-center gap-2 w-full">
                    <p className="text-base text-gray-400 w-full text-right truncate">
                      {seedPhrase?.name}
                    </p>
                  </div>
                </div>
              </button>
            )}
            {seedPhrase && (
              <button
                className="flex items-center gap-3 pl-4 w-full border-b border-white/10 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
                onClick={onShowSeedPhrase}
              >
                <FileLock className="size-5" />
                <div className={`flex-grow flex items-center gap-3 py-4 pr-4`}>
                  <p className="text-base font-medium w-full text-left">
                    Show Recovery Phrase
                  </p>
                  <ChevronRightIcon className="size-5" />
                </div>
              </button>
            )}
            <button
              className="flex items-center gap-3 pl-4 w-full hover:bg-white/10 transition-colors duration-200 cursor-pointer"
              onClick={onShowPrivateKey}
            >
              <FileKey2 className="size-5" />
              <div className={`flex-grow flex items-center gap-3 py-4 pr-4`}>
                <p className="text-base font-medium w-full text-left">
                  Show Private Key
                </p>
                <ChevronRightIcon className="size-5" />
              </div>
            </button>
          </div>
        )}

        <div className="bg-[var(--card-color)] rounded-lg w-full">
          <button
            className="flex items-center gap-3 pl-4 w-full transition-colors duration-200 cursor-pointer"
            onClick={onRemoveAccount}
          >
            <Trash2 className="size-5 text-red-400" />
            <div className={`flex-grow flex items-center gap-3 py-4 pr-4`}>
              <p className="text-base font-medium w-full text-left text-red-400">
                Remove Account
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </>
  );
};

export default MainEditAccount;
