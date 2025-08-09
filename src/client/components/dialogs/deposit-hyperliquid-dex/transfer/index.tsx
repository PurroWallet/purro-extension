import TransactionSuccess from "./transaction-success";
import useDepositTransferStore from "@/client/hooks/use-deposit-transfer-store";
import Transfer from "./transfer";

export const DepositHyperLiquidDexTransfer = () => {
  const { step } = useDepositTransferStore();

  return (
    <>
      {step === "transfer" && <Transfer />}
      {step === "success" && <TransactionSuccess />}
    </>
  );
};
