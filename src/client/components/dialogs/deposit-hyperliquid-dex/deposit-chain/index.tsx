import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';
import { X } from 'lucide-react';
import useDialogStore from '@/client/hooks/use-dialog-store';

const DepositChain = () => {
  const { closeDialog } = useDialogStore();
  return (
    <DialogWrapper>
      <DialogHeader
        title="Deposit USDC"
        onClose={closeDialog}
        icon={<X className="size-4" />}
      />
      <DialogContent>
        <div className="flex flex-col gap-4 items-center justify-center min-h-[120px]">
          <div className="flex flex-col gap-2 items-center">
            <span className="text-muted-foreground text-sm">
              Coming soon...
            </span>
          </div>
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};

export default DepositChain;
