import { AlertCircle } from "lucide-react";

const TabsError = () => {
  return (
    <div>
      <div className="flex items-center justify-center gap-2 mt-4">
        <AlertCircle className="size-6 text-red-400" />
        <p className="text-base text-gray-400">Error loading data.</p>
      </div>
    </div>
  );
};

export default TabsError;
