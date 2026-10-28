import { Route } from '@angular/router';
import { ProfilePageComponent } from './pages/profile-page/profile-page';
import { SettingsPageComponent } from './pages/settings-page/settings-page';

const profileRoutes: Route[] = [
  {
    path: '',
    component: ProfilePageComponent,
  },
  {
    path: 'settings',
    component: SettingsPageComponent,
  },
];

export default profileRoutes;
