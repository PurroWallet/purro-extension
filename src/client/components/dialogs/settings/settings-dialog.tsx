import { useState } from 'react';
import MainSettings from './main-settings';
import ConnectedDApps from './connected-dapps';
import AutoLockTime from './auto-lock-time';
import ChangePassword from './change-password';
import DeleteSeedPhrase from './delete-seedphrare';
import ResetWallet from './reset-wallet';
import ActiveNetwork from './active-network';
import DeveloperMode from './developer-mode';
import { AddressBook } from '../address-book';

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
    | 'address-book'
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
          onAddressBook={() => setScreen('address-book')}
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
      {screen === 'address-book' && (
        <AddressBook onBack={() => setScreen('main')} />
      )}
    </>
  );
};

export default SettingsDialog;
