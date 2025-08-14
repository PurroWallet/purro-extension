import useSendTokenHLStore from '@/client/hooks/use-send-token-HL-store';
import ChooseToken from './choose-token';
import SendToken from './send-token';
import ConfirmSend from './confirm-send';
import TransactionSuccess from './transaction-success';

export const SendOnHyperDex = () => {
  const { step } = useSendTokenHLStore();

  return (
    <>
      {step === 'select' && <ChooseToken />}
      {step === 'send' && <SendToken />}
      {step === 'confirm' && <ConfirmSend />}
      {step === 'success' && <TransactionSuccess />}
    </>
  );
};
