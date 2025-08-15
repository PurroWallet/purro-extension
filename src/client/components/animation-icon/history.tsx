import { motion } from 'motion/react';

const HomeAnimationIcon = ({
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
        d="M12 8V12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            rotate: 0,
            originX: '0%',
            originY: '100%',
          },
          hover: {
            rotate: -360,
            transition: {
              delay: 0.1,
              duration: 0.4,
              ease: 'easeOut',
            },
          },
        }}
      />
      <motion.path
        d="M12 12L14.5 14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? 'hover' : 'initial'}
        className="rotate-0"
        variants={{
          initial: {
            rotate: 0,
            originX: 0,
            originY: 0,
          },
          hover: {
            rotate: -360,
            originX: 0,
            originY: 0,
            transition: {
              delay: 0.2,
              duration: 0.2,
              ease: 'easeOut',
            },
          },
        }}
      />
      <motion.path
        d="M5.60414 5.60414L5.07381 5.07381V5.07381L5.60414 5.60414ZM4.33776 6.87052L3.58777 6.87429C3.58984 7.28556 3.92272 7.61844 4.33399 7.62051L4.33776 6.87052ZM6.87954 7.6333C7.29375 7.63539 7.63122 7.30129 7.6333 6.88708C7.63538 6.47287 7.30129 6.1354 6.88708 6.13332L6.87954 7.6333ZM5.07496 4.3212C5.07288 3.90699 4.73541 3.5729 4.3212 3.57498C3.90699 3.57706 3.5729 3.91453 3.57498 4.32874L5.07496 4.3212ZM3.82661 10.7849C3.88286 10.3745 3.59578 9.99627 3.1854 9.94002C2.77503 9.88377 2.39675 10.1708 2.3405 10.5812L3.82661 10.7849ZM18.8622 5.13777C15.042 1.31758 8.86873 1.27889 5.07381 5.07381L6.13447 6.13447C9.33358 2.93536 14.5571 2.95395 17.8016 6.19843L18.8622 5.13777ZM5.13777 18.8622C8.95796 22.6824 15.1313 22.7211 18.9262 18.9262L17.8655 17.8655C14.6664 21.0646 9.44291 21.0461 6.19843 17.8016L5.13777 18.8622ZM18.9262 18.9262C22.7211 15.1313 22.6824 8.95796 18.8622 5.13777L17.8016 6.19843C21.0461 9.44291 21.0646 14.6664 17.8655 17.8655L18.9262 18.9262ZM5.07381 5.07381L3.80743 6.34019L4.86809 7.40085L6.13447 6.13447L5.07381 5.07381ZM4.33399 7.62051L6.87954 7.6333L6.88708 6.13332L4.34153 6.12053L4.33399 7.62051ZM5.08775 6.86675L5.07496 4.3212L3.57498 4.32874L3.58777 6.87429L5.08775 6.86675ZM2.3405 10.5812C1.93907 13.5099 2.87392 16.5984 5.13777 18.8622L6.19843 17.8016C4.27785 15.881 3.48663 13.2652 3.82661 10.7849L2.3405 10.5812Z"
        fill="currentColor"
        animate={isHovered ? 'hover' : 'initial'}
        variants={{
          initial: {
            rotate: 0,
          },
          hover: {
            rotate: -360,
            transition: {
              duration: 0.5,
              ease: 'easeOut',
            },
          },
        }}
      />
    </motion.svg>
  );
};

export default HomeAnimationIcon;
