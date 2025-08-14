import ChooseToken from './choose-token';
import useSendTokenStore from '@/client/hooks/use-send-token-store';
import SendToken from './send-token';
import ConfirmSend from './confirm-send';
import TransactionSuccess from './transaction-success';

export const SendOnEVM = () => {
  const { step } = useSendTokenStore();

  return (
    <>
      {step === 'select' && <ChooseToken />}
      {step === 'send' && <SendToken />}
      {step === 'confirm' && <ConfirmSend />}
      {step === 'success' && <TransactionSuccess />}
    </>
  );
};
