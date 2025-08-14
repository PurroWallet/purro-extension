import { useState } from 'react';
import MainSettings from './main-settings';
import ConnectedDApps from './connected-dapps';
import AutoLockTime from './auto-lock-time';
import ChangePassword from './change-password';
import DeleteSeedPhrase from './delete-seedphrare';
import ResetWallet from './reset-wallet';
import ActiveNetwork from './active-network';
import DeveloperMode from './developer-mode';

const SettingsDialog = () => {
  const [screen, setScreen] = useState<
    | 'main'
    | 'connected-dapps'
    | 'lock-time'
    | 'change-password'
    | 'delete-seedphrase'
    | 'reset-wallet'
    | 'active-network'
    | 'token-cache-management'
    | 'developer-mode'
  >('main');

  return (
    <>
      {screen === 'main' && (
        <MainSettings
          onConnectedDApps={() => setScreen('connected-dapps')}
          onAutoLockTime={() => setScreen('lock-time')}
          onChangePassword={() => setScreen('change-password')}
          onDeleteSeedPhrase={() => setScreen('delete-seedphrase')}
          onResetWallet={() => setScreen('reset-wallet')}
          onActiveNetwork={() => setScreen('active-network')}
          onDeveloperMode={() => setScreen('developer-mode')}
        />
      )}
      {screen === 'connected-dapps' && (
        <ConnectedDApps onBack={() => setScreen('main')} />
      )}
      {screen === 'lock-time' && (
        <AutoLockTime onBack={() => setScreen('main')} />
      )}
      {screen === 'change-password' && (
        <ChangePassword onBack={() => setScreen('main')} />
      )}
      {screen === 'delete-seedphrase' && (
        <DeleteSeedPhrase onBack={() => setScreen('main')} />
      )}
      {screen === 'reset-wallet' && (
        <ResetWallet onBack={() => setScreen('main')} />
      )}
      {screen === 'active-network' && (
        <ActiveNetwork onBack={() => setScreen('main')} />
      )}
      {screen === 'developer-mode' && (
        <DeveloperMode onBack={() => setScreen('main')} />
      )}
    </>
  );
};

export default SettingsDialog;
