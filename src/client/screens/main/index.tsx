import LockDisplay from "@/client/component/display/lock-display";
import { Dialog } from "@/client/component/ui";
import useInit from "@/client/hooks/use-init";
import { createRoot } from "react-dom/client";

const Main = () => {
  useInit();

  return (
    <>
      <LockDisplay />
      <Dialog />
    </>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Main />);
}
