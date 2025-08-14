import IconName from "@/assets/Purro_Logotype_White.png";
import { cn } from "@/client/lib/utils";

const IconNameLogo = ({ className }: { className?: string }) => {
  return (
    <img
      src={IconName}
      alt="icon-name-logo"
      className={cn("h-8 object-contain", className)}
    />
  );
};

export default IconNameLogo;
