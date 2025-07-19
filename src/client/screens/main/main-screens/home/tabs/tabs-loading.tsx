import { Loader2 } from "lucide-react";

const TabsLoading = () => {
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Loader2 className="animate-spin size-8 text-[var(--primary-color-light)]" />
    </div>
  );
};

export default TabsLoading;
