import { useState } from "react";
import StepTracker from "../onboarding/step-tracker";
import ChooseImportMethod from "./choose-import-method";
import { ChevronLeft } from "lucide-react";
import ImportSeedPhrase from "../onboarding/import-steps/import-seed-phrase";
import ImportPrivateKey from "../onboarding/import-steps/import-private-key";
import ImportWatchOnly from "./import-watch-only";
import useCreateWalletStore from "@/client/hooks/use-create-wallet-store";
import ChooseChain from "../onboarding/import-steps/choose-chain";
import ImportFinish from "./import-finish";
import CreateAccount from "./create-account";
import Header from "@/client/components/common/header";
import { IconButton } from "@/client/components/ui";

const steps = ["import-method", "import", "finish"];

const ImportSteps = ({ onBack }: { onBack?: () => void }) => {
  const [step, setStep] = useState<"import-method" | "import" | "finish">(
    "import-method"
  );
  const [importMethod, setImportMethod] = useState<
    "seed" | "privateKey" | "create-account" | "watchOnly" | null
  >(null);

  const { chain, setChain, reset } = useCreateWalletStore();

  const handleBack = () => {
    if (step === "import") {
      if (
        importMethod === "privateKey" ||
        importMethod === "seed" ||
        importMethod === "create-account" ||
        importMethod === "watchOnly"
      ) {
        setStep("import-method");
        setImportMethod(null);
        setChain(null);
      }
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
            onCreateAccount={() => {
              setImportMethod("create-account");
              setStep("import");
            }}
            onSeedPhrase={() => {
              setImportMethod("seed");
              setStep("import");
            }}
            onPrivateKey={() => {
              setImportMethod("privateKey");
              setStep("import");
            }}
            onWatchOnly={() => {
              setImportMethod("watchOnly");
              setStep("import");
            }}
          />
        )}
        {step === "import" && importMethod === "create-account" && (
          <CreateAccount
            onNext={() => {
              setStep("finish");
            }}
          />
        )}
        {step === "import" && importMethod === "seed" && (
          <ImportSeedPhrase
            onNext={() => {
              setStep("finish");
            }}
          />
        )}
        {step === "import" &&
          importMethod === "privateKey" &&
          chain == null && <ChooseChain />}
        {step === "import" &&
          importMethod === "privateKey" &&
          chain != null && (
            <ImportPrivateKey
              onNext={() => {
                setStep("finish");
              }}
            />
          )}
        {step === "import" && importMethod === "watchOnly" && chain == null && (
          <ChooseChain />
        )}
        {step === "import" && importMethod === "watchOnly" && chain != null && (
          <ImportWatchOnly
            onNext={() => {
              setStep("finish");
            }}
          />
        )}
        {step === "finish" && (
          <ImportFinish
            onBack={() => {
              setStep("import-method");
              setImportMethod(null);
              reset();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ImportSteps;
