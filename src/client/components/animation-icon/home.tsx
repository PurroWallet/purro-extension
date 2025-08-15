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
        d="M2 12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274C22 8.77128 22 9.91549 22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039Z"
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
              bounce: 0.4,
              duration: 1,
            },
          },
        }}
      />
      <motion.path
        d="M12 15L12 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </motion.svg>
  );
};

export default HomeAnimationIcon;
