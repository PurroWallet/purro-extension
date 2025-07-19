import { useState } from "react";
import CreateWallet from "./create-wallet";
import { ChevronLeft } from "lucide-react";
import Header from "@/client/components/common/header";
import StepTracker from "../step-tracker";
import { cn } from "@/client/lib/utils";
import VerifyMnemonic from "./verify-mnemonic";
import AddPassword from "../add-password";
import Finish from "../finish";
import { IconButton } from "@/client/components/ui/button";

const steps = ["create", "verify-mnemonic", "add-password", "finish"];

const CreateSteps = ({ onBack }: { onBack: () => void }) => {
  const [step, setStep] = useState<
    "create" | "verify-mnemonic" | "add-password" | "finish"
  >("create");

  const handleBack = () => {
    if (step === "create") {
      onBack();
    } else if (step === "verify-mnemonic") {
      setStep("create");
    } else if (step === "add-password") {
      setStep("verify-mnemonic");
    }
  };

  return (
    <div className="flex flex-col size-full">
      <Header className={cn(step === "finish" && "justify-center")}>
        {step !== "finish" && (
          <IconButton onClick={handleBack}>
            <ChevronLeft className="size-4" />
          </IconButton>
        )}
        <StepTracker steps={steps} currentStep={step} />
        {step !== "finish" && <div className="size-8" />}
      </Header>
      {step === "create" && (
        <CreateWallet onNext={() => setStep("verify-mnemonic")} />
      )}
      {step === "verify-mnemonic" && (
        <VerifyMnemonic onNext={() => setStep("add-password")} />
      )}
      {step === "add-password" && (
        <AddPassword onNext={() => setStep("finish")} />
      )}
      {step === "finish" && <Finish />}
    </div>
  );
};

export default CreateSteps;
