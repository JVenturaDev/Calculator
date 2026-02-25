import { Routes } from '@angular/router';
import { Login } from './components/pages/login/login';
import { Register } from './components/pages/register/register/register';
import { WorkSpace } from './components/work-space/work-space';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [

  { path: 'login', component: Login },
  { path: 'register', component: Register },

  {
    path: 'workspace',
    component: WorkSpace,
    canActivate: [authGuard]
  },

  { path: '', redirectTo: 'workspace', pathMatch: 'full' },

  { path: '**', redirectTo: 'workspace' }
];