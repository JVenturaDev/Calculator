import { routes } from './app.routes';
import { GraphWorkspacePageComponent } from './components/graph-workspace/graph-workspace-page/graph-workspace-page';
import { Main } from './components/pages/main/main';
import { authGuard } from './guards/auth-guard';

describe('app routes', () => {
  it('defines the protected graph workspace route', () => {
    const route = routes.find(candidate => candidate.path === 'graph-workspace');

    expect(route).toBeDefined();
    expect(route?.component).toBe(GraphWorkspacePageComponent);
    expect(route?.canActivate).toEqual([authGuard]);
  });

  it('keeps the protected main route', () => {
    const route = routes.find(candidate => candidate.path === 'main');

    expect(route).toBeDefined();
    expect(route?.component).toBe(Main);
    expect(route?.canActivate).toEqual([authGuard]);
  });

  it('keeps the empty redirect to main', () => {
    const route = routes.find(candidate => candidate.path === '');

    expect(route).toEqual({
      path: '',
      redirectTo: 'main',
      pathMatch: 'full',
    });
  });

  it('keeps the wildcard redirect to main', () => {
    const route = routes.find(candidate => candidate.path === '**');

    expect(route).toEqual({
      path: '**',
      redirectTo: 'main',
    });
  });
});
