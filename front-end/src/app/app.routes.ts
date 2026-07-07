import { Routes } from '@angular/router';
import { Login } from './components/pages/login/login';
import { Register } from './components/pages/register/register/register';
import { authGuard } from './guards/auth-guard';
import { Main } from './components/pages/main/main';
import { GraphWorkspacePageComponent } from './components/graph-workspace/graph-workspace-page/graph-workspace-page';

export const routes: Routes = [

  { path: 'login', component: Login },
  { path: 'register', component: Register },

  {
    path: 'main',
    component: Main,
    canActivate: [authGuard]
  },

  {
    path: 'graph-workspace',
    component: GraphWorkspacePageComponent,
    canActivate: [authGuard],
  },

  { path: '', redirectTo: 'main', pathMatch: 'full' },

  { path: '**', redirectTo: 'main' }
];
