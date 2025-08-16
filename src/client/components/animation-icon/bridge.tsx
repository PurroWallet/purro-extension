import { motion } from 'motion/react';

const BridgeAnimationIcon = ({
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
      <path
        d="M12 9C10.3431 9 9 7.65685 9 6C9 4.34315 10.3431 3 12 3C13.6569 3 15 4.34315 15 6C15 7.65685 13.6569 9 12 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.5 21C3.84315 21 2.5 19.6569 2.5 18C2.5 16.3431 3.84315 15 5.5 15C7.15685 15 8.5 16.3431 8.5 18C8.5 19.6569 7.15685 21 5.5 21Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M18.5 21C16.8431 21 15.5 19.6569 15.5 18C15.5 16.3431 16.8431 15 18.5 15C20.1569 15 21.5 16.3431 21.5 18C21.5 19.6569 20.1569 21 18.5 21Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <motion.path
        d="M20 13C20 10.6106 18.9525 8.46589 17.2916 7M4 13C4 10.6106 5.04752 8.46589 6.70838 7M10 20.748C10.6392 20.9125 11.3094 21 12 21C12.6906 21 13.3608 20.9125 14 20.748"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            pathLength: 1,
            opacity: 1,
          },
          hover: {
            opacity: [0, 1],
            pathLength: [0, 1],
            transition: {
              duration: 1,
              ease: 'easeOut',
              delay: 0.3,
            },
          },
        }}
      />
    </motion.svg>
  );
};

export default BridgeAnimationIcon;
