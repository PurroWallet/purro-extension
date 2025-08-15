import { motion } from 'motion/react';

const ReceiveAnimationIcon = ({
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
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            pathLength: 1,
          },
          hover: {
            pathLength: [0, 1],
            transition: {
              duration: 0.3,
              ease: 'easeOut',
              delay: 0.3,
            },
          },
        }}
        transition={{
          duration: 0.3,
          ease: 'easeOut',
        }}
      />
      <motion.path
        d="M15 9L9 15M9 15L9 10.5M9 15L13.5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            x: 0,
            y: 0,
            opacity: 1,
          },
          hover: {
            x: [0, -20],
            y: [0, 20],
            opacity: 0,
            transition: {
              duration: 0.3,
              ease: 'easeOut',
            },
          },
        }}
      />
      <motion.path
        d="M15 9L9 15M9 15L9 10.5M9 15L13.5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            x: 0,
            y: 0,
            opacity: 0,
          },
          hover: {
            x: [20, 0],
            y: [-20, 0],
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: 'easeOut',
            },
          },
        }}
      />
    </motion.svg>
  );
};

export default ReceiveAnimationIcon;
