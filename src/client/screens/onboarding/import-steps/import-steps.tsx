import Header from "@/client/component/common/header";
import { useState } from "react";
import StepTracker from "../step-tracker";
import Finish from "../finish";
import ChooseImportMethod from "./choose-import-method";
import AddPassword from "../add-password";
import { ChevronLeft } from "lucide-react";
import ImportSeedPhrase from "./import-seed-phrase";
import ImportPrivateKey from "./import-private-key";
import ChooseChain from "./choose-chain";
import useCreateWalletStore from "@/client/hooks/use-create-wallet-store";
import { IconButton } from "@/client/component/ui/button";

const steps = ["import-method", "import", "password", "finish"];

const ImportSteps = ({ onBack }: { onBack?: () => void }) => {
  const [step, setStep] = useState<
    "import-method" | "import" | "password" | "finish"
  >("import-method");
  const [importMethod, setImportMethod] = useState<
    "seed-phrase" | "private-key" | null
  >(null);

  const { chain, setChain } = useCreateWalletStore();

  const handleBack = () => {
    if (step === "import") {
      if (importMethod === "private-key" || importMethod === "seed-phrase") {
        setStep("import-method");
        setImportMethod(null);
        setChain(null);
      }
    } else if (step === "password" && importMethod === "private-key") {
      setStep("import");
      setImportMethod("private-key");
    } else if (step === "password" && importMethod === "seed-phrase") {
      setStep("import");
      setImportMethod("seed-phrase");
    } else {
      onBack?.();
    }
  };

  const shouldShowBackButton =
    step !== "finish" && (step !== "import-method" || onBack !== undefined);

  return (
    <div className="flex flex-col size-full">
      <Header className="justify-center">
        {shouldShowBackButton && (
          <IconButton onClick={handleBack}>
            <ChevronLeft className="size-4" />
          </IconButton>
        )}
        <StepTracker steps={steps} currentStep={step} />
        {shouldShowBackButton && <div className="size-8" />}
      </Header>
      <div className="flex-1 overflow-y-auto">
        {step === "import-method" && importMethod === null && (
          <ChooseImportMethod
            onSeedPhrase={() => {
              setImportMethod("seed-phrase");
              setStep("import");
            }}
            onPrivateKey={() => {
              setImportMethod("private-key");
              setStep("import");
            }}
          />
        )}
        {step === "import" && importMethod === "seed-phrase" && (
          <ImportSeedPhrase
            onNext={() => {
              setStep("password");
            }}
          />
        )}
        {step === "import" &&
          importMethod === "private-key" &&
          chain == null && <ChooseChain />}
        {step === "import" &&
          importMethod === "private-key" &&
          chain != null && (
            <ImportPrivateKey
              onNext={() => {
                setStep("password");
              }}
            />
          )}
        {step === "password" && (
          <AddPassword onNext={() => setStep("finish")} />
        )}
        {step === "finish" && <Finish />}
      </div>
    </div>
  );
};

export default ImportSteps;
