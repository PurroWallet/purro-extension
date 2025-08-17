import { motion } from 'motion/react';

const SwapAnimationIcon = ({
  className,
  isHovered = false,
}: {
  className?: string;
  isHovered?: boolean;
}) => {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} size-6`}
      animate={isHovered ? 'hover' : 'initial'}
      initial="initial"
      variants={{
        initial: {
          scale: 1,
        },
        hover: {
          scale: 1.3,
          transition: {
            duration: 0.3,
            ease: 'easeOut',
          },
        },
      }}
    >
      <motion.path
        d="M16 18L16 6M16 6L20 10.125M16 6L12 10.125"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            y: 0,
          },
          hover: {
            y: -50,
            transition: {
              duration: 0.5,
              ease: 'easeOut',
              delay: 0.3,
            },
          },
        }}
      />
      <motion.path
        d="M16 18L16 6M16 6L20 10.125M16 6L12 10.125"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            y: 50,
          },
          hover: {
            y: 0,
            transition: {
              duration: 0.5,
              ease: 'easeOut',
              delay: 0.3,
            },
          },
        }}
      />
      <motion.path
        d="M8 6L8 18M8 18L12 13.875M8 18L4 13.875"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            y: -50,
          },
          hover: {
            y: 0,
            transition: {
              duration: 0.5,
              ease: 'easeOut',
              delay: 0.3,
            },
          },
        }}
      />
      <motion.path
        d="M8 6L8 18M8 18L12 13.875M8 18L4 13.875"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            y: 0,
          },
          hover: {
            y: 50,
            transition: {
              duration: 0.5,
              ease: 'easeOut',
              delay: 0.3,
            },
          },
        }}
      />
    </motion.svg>
  );
};

export default SwapAnimationIcon;
