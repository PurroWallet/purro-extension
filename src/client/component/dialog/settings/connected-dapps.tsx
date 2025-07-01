import { useEffect, useState } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogWrapper,
} from "@/client/component/ui/dialog";
import { Globe, Clock, Unplug, X } from "lucide-react";
import useWallet from "@/client/hooks/use-wallet";
// import { StorageService } from "@/client/services/storage-service";
import { formatDate } from "@/utils/formatters";
import { Button } from "@/client/component/ui";
import useWalletStore from "@/client/hooks/use-wallet-store";

interface ConnectedSite {
  origin: string;
  connectedAt: number;
  favicon?: string;
}

const getDomainFromOrigin = (origin: string): string => {
  try {
    return new URL(origin).hostname;
  } catch {
    return origin;
  }
};

const getTimeCategory = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;
  if (diff < oneDay) {
    return "Today";
  } else if (diff < oneWeek) {
    return "This week";
  } else if (diff < oneMonth) {
    return "This month";
  } else {
    return "Earlier";
  }
};

const groupSitesByTime = (sites: ConnectedSite[]) => {
  const groups: { [key: string]: ConnectedSite[] } = {
    Today: [],
    "This week": [],
    "This month": [],
    Earlier: [],
  };

  sites.forEach((site) => {
    const category = getTimeCategory(site.connectedAt);
    groups[category].push(site);
  });

  return groups;
};

const ConnectedDAppsDialog = ({ onBack }: { onBack: () => void }) => {
  const { activeAccount } = useWalletStore();
  const [connectedSites, setConnectedSites] = useState<ConnectedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitRemoveAll, setSubmitRemoveAll] = useState(false);

  useEffect(() => {
    loadConnectedSites();
  }, [activeAccount]);

  const loadConnectedSites = async () => {
    if (!activeAccount) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // const sites = await StorageService.getConnectedSitesWithTimestamps(
      //   activeAccount.id
      // );
      // setConnectedSites(sites);
    } catch (error) {
      console.error("Failed to load connected sites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (origin: string) => {
    if (!activeAccount) return;

    try {
      // await StorageService.removeAccountConnection(activeAccount.id, origin);
      // Reload the list
      await loadConnectedSites();
    } catch (error) {
      console.error("Failed to disconnect site:", error);
    }
  };

  const handleDisconnectAll = async () => {
    if (!activeAccount) return;

    try {
      // await StorageService.removeAllConnectionsWithAccount(activeAccount.id);
      // Reload the list
      await loadConnectedSites();
      setSubmitRemoveAll(false);
    } catch (error) {
      console.error("Failed to disconnect all sites:", error);
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Connected DApps"
        onClose={onBack}
        rightContent={
          <button
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
            onClick={() => setSubmitRemoveAll(!submitRemoveAll)}
          >
            <div className="relative">
              <X
                className={`size-4 text-white absolute transition-all duration-300 ${
                  submitRemoveAll
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 rotate-90 scale-75"
                }`}
              />
              <Unplug
                className={`size-4 text-red-400 transition-all duration-300 ${
                  submitRemoveAll
                    ? "opacity-0 rotate-90 scale-75"
                    : "opacity-100 rotate-0 scale-100"
                }`}
              />
            </div>
          </button>
        }
      />
      <DialogContent className="p-4 flex-1 overflow-y-auto relative">
        <div
          className={`absolute top-0 right-0 w-full bg-[var(--background-color)] p-4 rounded-b-lg border-b border-white/10 flex items-center justify-between transition-all duration-300 ease-in-out ${
            submitRemoveAll
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <p className="text-base w-full animate-fade-in">
            Disconnect all connections?
          </p>
          <Button
            onClick={handleDisconnectAll}
            className="text-red-500 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 px-3 py-2 transition-all duration-200 hover:scale-105 active:scale-95 text-sm w-fit"
          >
            Disconnect
          </Button>
        </div>

        <div
          className={`transition-all duration-300 ${
            submitRemoveAll ? "mt-20" : "mt-0"
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8 animate-fade-in">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-color)]"></div>
            </div>
          ) : connectedSites.length === 0 ? (
            <div className="text-center py-8 animate-fade-in">
              <Globe className="size-12 text-white/30 mx-auto mb-4 animate-pulse" />
              <p className="text-white/60">No connected DApps</p>
              <p className="text-sm text-white/40 mt-2">
                Connect to DApps to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm text-white/40">
                Connected DApps with {activeAccount?.name}
              </p>
              {Object.entries(groupSitesByTime(connectedSites)).map(
                ([category, sites], categoryIndex) => {
                  if (sites.length === 0) return null;

                  return (
                    <div
                      key={category}
                      className="animate-slide-up"
                      style={{
                        animationDelay: `${categoryIndex * 100}ms`,
                        animationFillMode: "both",
                      }}
                    >
                      <h3 className="text-sm font-medium text-white/60 mb-1">
                        {category}
                      </h3>
                      <div className="space-y-3">
                        {sites.map((site, siteIndex) => (
                          <div
                            key={site.origin}
                            className="bg-[var(--card-color)] rounded-lg p-3 border border-white/10 transition-all duration-200 hover:border-white/20 hover:bg-[var(--card-color)]/80 hover:scale-[1.02] hover:shadow-lg animate-slide-up"
                            style={{
                              animationDelay: `${
                                categoryIndex * 100 + siteIndex * 50
                              }ms`,
                              animationFillMode: "both",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="size-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden transition-all duration-200 hover:bg-white/20">
                                  {site.favicon ? (
                                    <img
                                      src={site.favicon}
                                      alt={getDomainFromOrigin(site.origin)}
                                      className="size-full object-contain transition-transform duration-200 hover:scale-110"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        target.nextElementSibling?.classList.remove(
                                          "hidden"
                                        );
                                      }}
                                    />
                                  ) : null}
                                  <Globe
                                    className={`size-5 text-[var(--primary-color)] transition-transform duration-200 hover:scale-110 ${
                                      site.favicon ? "hidden" : ""
                                    }`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-medium text-white truncate">
                                    {getDomainFromOrigin(site.origin)}
                                  </h3>
                                  <div className="flex items-center gap-1 text-sm text-white/60 mt-1">
                                    <Clock className="size-3 animate-pulse" />
                                    <p
                                      className="text-xs text-white/40"
                                      title={formatDate(site.connectedAt)}
                                    >
                                      {formatDate(site.connectedAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleDisconnect(site.origin)}
                                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 px-3 py-2 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-lg"
                              >
                                <Unplug className="size-4 transition-transform duration-200 hover:rotate-12" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </DialogContent>

      <style>
        {`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
        `}
      </style>
    </DialogWrapper>
  );
};

export default ConnectedDAppsDialog;
