import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckoutControlsPanel } from './CheckoutControlsPanel';

export interface CheckoutMobilePaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  controlsPanelProps: any;
}

export const CheckoutMobilePaymentSheet: React.FC<CheckoutMobilePaymentSheetProps> = ({
  isOpen,
  onClose,
  controlsPanelProps
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-[100]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[101] bg-zinc-950 border-t border-zinc-800 rounded-t-[3rem] shadow-md max-h-[90vh] overflow-y-auto no-scrollbar pb-[max(env(safe-area-inset-bottom,0px),16px)]"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4" />
            <CheckoutControlsPanel {...controlsPanelProps} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
