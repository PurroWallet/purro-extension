import { createRoot } from "react-dom/client";
import { LockDisplay } from "@/client/components/display";
import UniverseBackground from "@/client/components/universe-background";
import ImportSteps from "./import-steps";

const Import = () => {
  return (
    <div className="relative">
      <UniverseBackground className="absolute inset-0 z-0" />
      <div className="container mx-auto max-w-md h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center h-[600px] w-full border border-white/10 rounded-xl shadow bg-[var(--background-color)]/30 backdrop-blur-md z-10 overflow-hidden relative">
          <LockDisplay />
          <ImportSteps />
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Import />);
}
