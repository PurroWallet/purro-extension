import { useUnifiedTokens } from '@/client/hooks/use-unified-tokens';
import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import useDialogStore from '@/client/hooks/use-dialog-store';
import TokenList from '@/client/components/token-list';
import { X } from 'lucide-react';
import { UnifiedToken } from '@/client/components/token-list';
import useSendTokenStore from '@/client/hooks/use-send-token-store';

const ChooseToken = () => {
  const { allUnifiedTokens, isLoading, hasError } = useUnifiedTokens();
  const { closeDialog } = useDialogStore();
  const { setStep, setToken } = useSendTokenStore();

  // Filter only EVM tokens (include all EVM chains)
  const evmTokens = allUnifiedTokens.filter(
    token =>
      token.chain === 'ethereum' ||
      token.chain === 'base' ||
      token.chain === 'arbitrum' ||
      token.chain === 'hyperevm'
  );

  const handleClick = (token: UnifiedToken) => {
    setToken(token);
    setStep('send');
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Select Token to Send"
        onClose={closeDialog}
        icon={<X className="size-4" />}
      />
      <DialogContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading tokens...</div>
          </div>
        ) : hasError ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">Error loading tokens</div>
          </div>
        ) : (
          <TokenList
            tokens={evmTokens}
            onTokenClick={handleClick}
            emptyMessage="No EVM tokens available to send"
          />
        )}
      </DialogContent>
      <DialogFooter>
        <Button onClick={closeDialog} variant="secondary" className="w-full">
          Cancel
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default ChooseToken;
