import React from 'react';

const StepTracker = ({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: string;
}) => {
  const currentIndex = steps.findIndex(step => step === currentStep);

  return (
    <div className="flex-1 flex items-center justify-center space-x-2">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div
            className={`w-3 h-3 rounded-full ${
              index <= currentIndex
                ? 'bg-[var(--primary-color-light)]'
                : 'bg-[var(--card-color)]'
            }`}
          />
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 ${
                index < currentIndex
                  ? 'bg-[var(--primary-color-light)]'
                  : 'bg-[var(--card-color)]'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepTracker;
