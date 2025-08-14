import { useState } from 'react';
import EditIcon from './edit-icon';
import MainEditAccount from './main-edit-account';
import EditName from './edit-name';
import ShowPrivateKey from './show-private-key/show-private-key';
import ShowSeedPhrase from './show-seed-phrase/show-seed-phrase';
import DeleteAccount from './delete-account';
import useDialogStore from '@/client/hooks/use-dialog-store';

const EditAccount = () => {
  const { closeDialog } = useDialogStore();
  const [screen, setScreen] = useState<
    | 'main'
    | 'edit-icon'
    | 'edit-name'
    | 'show-seedphrase'
    | 'show-privatekey'
    | 'delete'
  >('main');

  return (
    <>
      {screen === 'main' && (
        <MainEditAccount
          onEditIcon={() => setScreen('edit-icon')}
          onEditName={() => setScreen('edit-name')}
          onShowSeedPhrase={() => setScreen('show-seedphrase')}
          onShowPrivateKey={() => setScreen('show-privatekey')}
          onRemoveAccount={() => setScreen('delete')}
        />
      )}
      {screen === 'edit-icon' && <EditIcon onBack={() => setScreen('main')} />}
      {screen === 'edit-name' && <EditName onBack={() => setScreen('main')} />}
      {screen === 'show-seedphrase' && (
        <ShowSeedPhrase onBack={() => setScreen('main')} />
      )}
      {screen === 'show-privatekey' && (
        <ShowPrivateKey onBack={() => setScreen('main')} />
      )}
      {screen === 'delete' && (
        <DeleteAccount
          onRemove={() => {
            closeDialog();
          }}
          onBack={() => {
            setScreen('main');
          }}
        />
      )}
    </>
  );
};

export default EditAccount;
