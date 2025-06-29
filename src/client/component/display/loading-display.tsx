import { Loader2 } from "lucide-react";

const LoadingDisplay = ({
  className = "text-[var(--primary-color-light)]",
}: {
  className?: string;
}) => {
  return (
    <div className="flex flex-col items-center justify-center size-full">
      <div className="flex-1 size-full flex flex-col items-center justify-center gap-2">
        <Loader2 className={`size-10 ${className} animate-spin`} />
      </div>
    </div>
  );
};

export default LoadingDisplay;
