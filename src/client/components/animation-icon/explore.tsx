import { motion } from 'motion/react';

const ExploreAnimationIcon = ({
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
          y: 0,
        },
        hover: {
          scale: 1.3,
          y: [-1, 1, -1],
          transition: {
            scale: {
              duration: 0.3,
              ease: 'easeOut',
            },
            y: {
              duration: 1.5,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatType: 'loop',
            },
          },
        },
      }}
    >
      <path
        d="M20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <motion.path
        d="M17.8486 6.19085C19.8605 5.81929 21.3391 5.98001 21.8291 6.76327C22.8403 8.37947 19.2594 12.0342 13.8309 14.9264C8.40242 17.8185 3.18203 18.8529 2.17085 17.2367C1.63758 16.3844 2.38148 14.9651 4 13.3897"
        stroke="currentColor"
        strokeWidth="1.5"
        variants={{
          initial: {
            pathLength: 1,
            pathOffset: 0,
          },
          hover: {
            pathLength: [1, 0, 1, 0],
            pathOffset: [1, 1, 0, 0],
            transition: {
              duration: 2,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatType: 'loop',
            },
          },
        }}
      />
    </motion.svg>
  );
};

export default ExploreAnimationIcon;
