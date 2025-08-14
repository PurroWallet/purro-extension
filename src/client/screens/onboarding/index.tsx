import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;
import UniverseBackground from '@/client/components/universe-background';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import Welcome from './welcome';
import CreateSteps from './create-steps/create-steps';
import ImportSteps from './import-steps/import-steps';

const Onboarding = () => {
  const [step, setStep] = useState<'welcome' | 'create' | 'import' | 'success'>(
    'welcome'
  );

  return (
    <div className="relative">
      <UniverseBackground />
      <div className="container mx-auto max-w-md h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center h-[600px] w-full border border-white/10 rounded-xl shadow bg-[var(--background-color)]/30 backdrop-blur-md z-10 overflow-hidden">
          {step === 'welcome' && (
            <Welcome
              onCreate={() => setStep('create')}
              onImport={() => setStep('import')}
            />
          )}
          {step === 'create' && (
            <CreateSteps onBack={() => setStep('welcome')} />
          )}
          {step === 'import' && (
            <ImportSteps onBack={() => setStep('welcome')} />
          )}
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Onboarding />);
}
