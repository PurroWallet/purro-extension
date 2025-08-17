import { useEffect } from 'react';
import { DialogHeader, DialogWrapper } from '@/client/components/ui';
import { X } from 'lucide-react';
import useDialogStore from '@/client/hooks/use-dialog-store';
import useDepositChainStore from '@/client/hooks/use-deposit-chain-store';
import InputAmount from './input-amount';
import Pending from './pending';
import Success from './success';
import Error from './error';

const DepositChain = () => {
  const { closeDialog } = useDialogStore();
  const { step, reset } = useDepositChainStore();

  // Reset state when component mounts
  useEffect(() => {
    reset();
  }, [reset]);

  const renderStep = () => {
    switch (step) {
      case 'input':
        return <InputAmount />;
      case 'pending':
        return <Pending />;
      case 'success':
        return <Success />;
      case 'error':
        return <Error />;
      default:
        return <InputAmount />;
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'input':
        return 'Deposit USDC';
      case 'pending':
        return 'Transaction Pending';
      case 'success':
        return 'Deposit Successful';
      case 'error':
        return 'Transaction Failed';
      default:
        return 'Deposit USDC';
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title={getTitle()}
        onClose={closeDialog}
        icon={<X className="size-4" />}
      />
      {renderStep()}
    </DialogWrapper>
  );
};

export default DepositChain;
