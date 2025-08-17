import { SKELETON } from '../constants';

export const TransactionItemSkeleton = () => {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg ${SKELETON.ANIMATION}`}
    >
      {/* Token/Network Icon Skeleton */}
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} relative me-1`}
      >
        {/* Method indicator skeleton */}
        <div
          className={`absolute -top-1 -left-1 w-5 h-5 rounded-full ${SKELETON.COLORS.INDICATOR_LIGHT} ${SKELETON.COLORS.INDICATOR_DARK}`}
        ></div>
      </div>

      {/* Transaction Info Skeleton */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Method label skeleton */}
          <div
            className={`${SKELETON.SIZES.METHOD_LABEL} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded`}
          ></div>
        </div>

        {/* Token/Asset name skeleton */}
        <div
          className={`${SKELETON.SIZES.TOKEN_NAME} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded mb-1`}
        ></div>

        {/* Transaction time skeleton */}
        <div
          className={`${SKELETON.SIZES.TIME} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded`}
        ></div>
      </div>

      {/* Amount Skeleton */}
      <div className="text-right flex flex-col items-end">
        {/* Amount skeleton */}
        <div
          className={`${SKELETON.SIZES.AMOUNT} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded mb-1`}
        ></div>

        {/* Chain badge skeleton */}
        <div className="flex items-center justify-center gap-2">
          <div
            className={`${SKELETON.SIZES.CHAIN_NAME} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded`}
          ></div>
          <div
            className={`size-4 rounded-full ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK}`}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Skeleton for swap transactions
export const SwapTransactionItemSkeleton = () => {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg ${SKELETON.ANIMATION}`}
    >
      {/* Swap Icons Skeleton */}
      <div className="flex items-center relative mr-4 pb-4">
        {/* Input Token Icon */}
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} relative`}
        ></div>

        {/* Output Token Icon */}
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} absolute top-3 left-3`}
        ></div>
      </div>

      {/* Transaction Info Skeleton */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Method label skeleton */}
          <div
            className={`${SKELETON.SIZES.METHOD_LABEL} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded`}
          ></div>
        </div>

        {/* Swap info skeleton */}
        <div
          className={`${SKELETON.SIZES.SWAP_INFO} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded mb-1`}
        ></div>

        {/* Transaction time skeleton */}
        <div
          className={`${SKELETON.SIZES.TIME} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded`}
        ></div>
      </div>

      {/* Amount Skeleton */}
      <div className="text-right flex flex-col items-end">
        {/* Input amount skeleton */}
        <div
          className={`${SKELETON.SIZES.SWAP_AMOUNT} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded mb-1`}
        ></div>

        {/* Output amount skeleton */}
        <div
          className={`${SKELETON.SIZES.SWAP_AMOUNT} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded mb-1`}
        ></div>

        {/* Chain badge skeleton */}
        <div className="flex items-center justify-center gap-2">
          <div
            className={`${SKELETON.SIZES.CHAIN_NAME} ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK} rounded`}
          ></div>
          <div
            className={`size-4 rounded-full ${SKELETON.COLORS.LIGHT} ${SKELETON.COLORS.DARK}`}
          ></div>
        </div>
      </div>
    </div>
  );
};
