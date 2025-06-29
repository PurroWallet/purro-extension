import { motion } from "motion/react";

import { AnimatePresence } from "motion/react";
import useDrawerStore from "@/client/hooks/use-drawer-store";

export const Drawer = () => {
  const { isOpen, component, closeDrawer } = useDrawerStore();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-[39] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => closeDrawer()}
        >
          <motion.div
            className="bg-[var(--card-color)] flex flex-col h-fit w-full round z-[40] rounded-t-lg"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {component}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
