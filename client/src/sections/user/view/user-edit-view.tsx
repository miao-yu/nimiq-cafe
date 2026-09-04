import { DashboardContent } from 'src/layouts/dashboard';

import { UserNewEditForm } from '../user-new-edit-form';

// ----------------------------------------------------------------------

export function UserEditView() {
  return (
    <DashboardContent>
      <UserNewEditForm />
    </DashboardContent>
  );
}
