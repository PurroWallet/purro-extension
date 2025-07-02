import IconName from "@/assets/icon-name.png";
import { cn } from "@/client/lib/utils";

const IconNameLogo = ({ className }: { className?: string }) => {
  return (
    <img
      src={IconName}
      alt="icon-name-logo"
      className={cn("h-10", className)}
    />
  );
};

export default IconNameLogo;
