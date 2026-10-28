import { Routes } from '@angular/router';
import { AuthLayout } from './layout/auth-layout';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { GoogleCallback } from './pages/google-callback/google-callback';
import { publicGuard } from '../shared/guards/public-guard';

export const authRoutes: Routes = [
  {
    path: '',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        canActivate: [publicGuard],
        component: Login,
      },
      {
        path: 'signup',
        canActivate: [publicGuard],
        component: Signup,
      },
      {
        path: 'forgot-password',
        canActivate: [publicGuard],
        component: ForgotPassword,
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'callback',
    component: GoogleCallback,
  },
];
export default authRoutes;
