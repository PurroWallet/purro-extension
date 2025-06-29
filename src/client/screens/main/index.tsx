import useInit from "@/client/hooks/use-init";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { createRoot } from "react-dom/client";

const Main = () => {
  useInit();

  const { loading, hasWallet, initialized, isLocked, accounts, error } =
    useWalletStore();

  console.log("🎯 Main component state:", {
    loading,
    hasWallet,
    initialized,
    isLocked,
    accountsCount: accounts.length,
    error,
  });

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2>Purro Wallet - Main Screen</h2>
      <div style={{ padding: "10px", marginTop: "10px" }}>
        <h3>Debug Info:</h3>
        <p>
          <strong>Loading:</strong> {loading ? "Yes" : "No"}
        </p>
        <p>
          <strong>Initialized:</strong> {initialized ? "Yes" : "No"}
        </p>
        <p>
          <strong>Has Wallet:</strong> {hasWallet ? "Yes" : "No"}
        </p>
        <p>
          <strong>Is Locked:</strong> {isLocked ? "Yes" : "No"}
        </p>
        <p>
          <strong>Accounts Count:</strong> {accounts.length}
        </p>
        {error && (
          <p style={{ color: "red" }}>
            <strong>Error:</strong> {error}
          </p>
        )}
      </div>
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Main />);
}
