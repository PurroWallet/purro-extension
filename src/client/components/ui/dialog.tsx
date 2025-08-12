import { cn } from "@/client/lib/utils";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import useDialogStore from "@/client/hooks/use-dialog-store";

const DialogContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "p-4 flex-1 overflow-y-auto flex flex-col gap-4",
        className
      )}
    >
      {children}
    </div>
  );
};

const DialogHeader = ({
  icon,
  title,
  onClose,
  rightContent,
}: {
  icon?: React.ReactNode;
  title: string;
  onClose: () => void;
  rightContent?: React.ReactNode;
}) => {
  return (
    <div className="flex items-center gap-2 justify-between py-2 px-3 border-b border-white/10 ">
      <button
        onClick={onClose}
        className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
      >
        {icon ?? <ArrowLeft className="size-4 text-white" />}
      </button>
      <h1 className="text-lg font-semibold truncate flex-1 text-center">
        {title}
      </h1>
      {rightContent ? rightContent : <div className="size-8" />}
    </div>
  );
};

const DialogFooter = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 justify-between py-3 px-4",
        className
      )}
    >
      {children}
    </div>
  );
};

const DialogWrapper = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={cn("flex flex-col h-full", className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: 0.2,
          ease: [0.25, 0.46, 0.45, 0.94],
          type: "tween",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

const Dialog = () => {
  const { isOpen, component } = useDialogStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-[var(--background-color)] size-full flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
          >
            {component}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogWrapper };
