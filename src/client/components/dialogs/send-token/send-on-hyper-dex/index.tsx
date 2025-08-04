import useSendTokenHLStore from "@/client/hooks/use-send-token-HL-store";
import ChooseToken from "./choose-token";
import SendToken from "./send-token";
import ConfirmSend from "./confirm-send";

export const SendOnHyperDex = () => {
  const { step } = useSendTokenHLStore();

  return (
    <>
      {step === "select" && <ChooseToken />}
      {step === "send" && <SendToken />}
      {step === "confirm" && <ConfirmSend />}
    </>
  );
};
