import { Buffer } from "buffer";
(globalThis as any).Buffer = Buffer;
import { createRoot } from "react-dom/client";

const Import = () => {
  return <div>Main</div>;
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Import />);
}
