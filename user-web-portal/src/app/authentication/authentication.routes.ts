import { Routes } from '@angular/router';
import { AuthenticationLayout } from './layout/authentication-layout/authentication-layout';
import { SigninPage } from './pages/signin-page/signin-page';
import { SignupPage } from './pages/signup-page/signup-page';
import { ForgotPasswordPage } from './pages/forgot-password-page/forgot-password-page';
import { AuthenticationCallbackPage } from './pages/authentication-callback-page/authentication-callback-page';
import { publicGuard } from '../shared/guards/public-guard';

export const authenticationRoutes: Routes = [
  {
    path: '',
    component: AuthenticationLayout,
    children: [
      {
        path: 'signin',
        canActivate: [publicGuard],
        component: SigninPage,
      },
      {
        path: 'signup',
        canActivate: [publicGuard],
        component: SignupPage,
      },
      {
        path: 'forgot-password',
        canActivate: [publicGuard],
        component: ForgotPasswordPage,
      },
      {
        path: '',
        redirectTo: 'signin',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'callback',
    component: AuthenticationCallbackPage,
  },
];

export default authenticationRoutes;
