import { cn } from "@/client/lib/utils";

const MainContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex-1 overflow-y-auto", className)}>{children}</div>
  );
};

export default MainContent;
