import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import Complex from 'complex.js';

import {
  WorkspaceCalculation,
  WorkspaceItem,
} from '../../components/work-space/work-space';
import { AuthSessionService } from '../auth/auth-session';
import { CalculationMapper } from '../mappers/calculation-mapper';
import { ToastService } from '../toast-services/toast';
import { WorkspaceApiService } from '../workspaceApiService/workspace-api-service';
import {
  DemoWorkspaceSnapshot,
  DemoWorkspaceStorageService,
} from './demo-workspace-storage';
import { WorkspaceService } from './worsk-space-service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let api: jasmine.SpyObj<WorkspaceApiService>;
  let authSession: jasmine.SpyObj<AuthSessionService>;
  let demoStorage: jasmine.SpyObj<DemoWorkspaceStorageService>;
  let toast: jasmine.SpyObj<ToastService>;
  let demoMode: boolean;
  let realToken: string | null;

  beforeEach(() => {
    demoMode = true;
    realToken = null;
    api = jasmine.createSpyObj<WorkspaceApiService>(
      'WorkspaceApiService',
      [
        'getItems',
        'createItem',
        'updateTags',
        'updateExpression',
        'deleteItem',
        'addCalculationDTO',
      ]
    );
    api.getItems.and.returnValue(of([]));

    authSession = jasmine.createSpyObj<AuthSessionService>(
      'AuthSessionService',
      ['isDemoGuest', 'getRealToken']
    );
    authSession.isDemoGuest.and.callFake(() => demoMode);
    authSession.getRealToken.and.callFake(() => realToken);

    demoStorage = jasmine.createSpyObj<DemoWorkspaceStorageService>(
      'DemoWorkspaceStorageService',
      ['load', 'loadWithDiagnostics', 'save']
    );
    demoStorage.loadWithDiagnostics.and.returnValue({
      snapshot: emptySnapshot(),
    });
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
  });

  it('initializes demo state from storage without loading the backend', () => {
    const item = createItem('demo-item');
    setDemoSnapshot(snapshot([item], item.id));

    createService();

    expect(service.workspaceItems$.value).toEqual([item]);
    expect(service.activeItemId$.value).toBe(item.id);
    expect(api.getItems).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports corrupt demo data, starts empty and allows a later recovery save', () => {
    const parseError = new SyntaxError('Invalid JSON');
    demoStorage.loadWithDiagnostics.and.returnValue({
      snapshot: emptySnapshot(),
      issue: 'corrupt',
      error: parseError,
    });
    const consoleError = spyOn(console, 'error');

    createService();
    service.createItem({
      title: 'Recovered demo',
      type: 'scientific',
      tags: [],
    });

    expect(service.workspaceItems$.value.length).toBe(1);
    expect(demoStorage.save).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledOnceWith(
      'Error loading demo workspace:',
      parseError
    );
    expect(toast.error).toHaveBeenCalledOnceWith(
      'No se pudieron recuperar los datos locales del Workspace demo. Se inició un espacio vacío.',
      8000
    );
  });

  it('reports an unsupported storage version and keeps the demo in memory only', () => {
    demoStorage.loadWithDiagnostics.and.returnValue({
      snapshot: emptySnapshot(),
      issue: 'unsupported-version',
    });

    createService();
    service.createItem({
      title: 'In-memory demo',
      type: 'scientific',
      tags: [],
    });

    expect(service.workspaceItems$.value.length).toBe(1);
    expect(demoStorage.save).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnceWith(
      'Los datos locales del Workspace demo pertenecen a una versión incompatible. Se inició un espacio vacío.',
      8000
    );
  });

  it('does not break initialization when storage is unavailable', () => {
    const securityError = new DOMException('Storage blocked', 'SecurityError');
    demoStorage.loadWithDiagnostics.and.returnValue({
      snapshot: emptySnapshot(),
      issue: 'unavailable',
      error: securityError,
    });
    const consoleError = spyOn(console, 'error');

    expect(() => createService()).not.toThrow();
    service.createItem({
      title: 'Available in memory',
      type: 'scientific',
      tags: [],
    });

    expect(service.workspaceItems$.value.length).toBe(1);
    expect(demoStorage.save).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledOnceWith(
      'Error loading demo workspace:',
      securityError
    );
    expect(toast.error).toHaveBeenCalledOnceWith(
      'El navegador bloqueó el almacenamiento del Workspace demo. Los cambios se conservarán solo durante esta sesión.',
      8000
    );
  });

  it('loads the backend for a real session and does not duplicate GET on reinitialize', () => {
    demoMode = false;
    realToken = 'real-token';
    const item = createItem('real-item');
    api.getItems.and.returnValue(of([item]));

    createService();
    service.initializeForCurrentSession();
    service.initializeForCurrentSession();

    expect(api.getItems).toHaveBeenCalledTimes(1);
    expect(service.workspaceItems$.value[0].id).toBe('real-item');
    expect(demoStorage.loadWithDiagnostics).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('creates and activates an item locally in demo without calling the API', () => {
    createService();

    service.createItem({
      title: 'Nueva demo',
      type: 'scientific',
      tags: ['local'],
    });

    const created = service.workspaceItems$.value[0];
    const saved = latestSnapshot();
    expect(created.title).toBe('Nueva demo');
    expect(service.activeItemId$.value).toBe(created.id);
    expect(saved.items[0].id).toBe(created.id);
    expect(saved.activeItemId).toBe(created.id);
    expect(api.createItem).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('contains quota errors, reports once and keeps later demo changes in memory', () => {
    createService();
    const quotaError = new DOMException(
      'Storage quota exceeded',
      'QuotaExceededError'
    );
    demoStorage.save.and.callFake(() => {
      throw quotaError;
    });
    const consoleError = spyOn(console, 'error');

    expect(() =>
      service.createItem({
        title: 'Quota demo',
        type: 'scientific',
        tags: [],
      })
    ).not.toThrow();

    const activeId = service.activeItemId$.value as string;
    service.updateCurrentExpression(activeId, '2+2');
    service.addCalculationToActiveItem({
      id: 'calculation-after-quota',
      expression: '2+2',
      result: 4,
      steps: [],
      timestamp: new Date('2026-01-03T12:00:00.000Z'),
    });

    const item = service.workspaceItems$.value[0];
    expect(item.calculations.length).toBe(1);
    expect(item.currentExpression).toBe('');
    expect(demoStorage.save).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledOnceWith(
      'Error saving demo workspace:',
      quotaError
    );
    expect(toast.error).toHaveBeenCalledOnceWith(
      'El almacenamiento del Workspace demo está lleno. Los nuevos cambios se conservarán solo durante esta sesión.',
      8000
    );
  });

  it('uses the generic save message for non-storage persistence errors', () => {
    createService();
    const saveError = new Error('Unsupported value');
    demoStorage.save.and.callFake(() => {
      throw saveError;
    });
    spyOn(console, 'error');

    service.createItem({
      title: 'Fallback demo',
      type: 'scientific',
      tags: [],
    });

    expect(toast.error).toHaveBeenCalledOnceWith(
      'No se pudieron guardar los cambios del Workspace demo. Continuarán disponibles mientras esta página permanezca abierta.',
      8000
    );
  });

  it('retries persistence after leaving and entering a new demo context', () => {
    createService();
    demoStorage.save.and.callFake(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    });
    spyOn(console, 'error');
    service.createItem({
      title: 'First demo',
      type: 'scientific',
      tags: [],
    });

    demoMode = false;
    realToken = 'real-token';
    service.initializeForCurrentSession();

    demoMode = true;
    realToken = null;
    demoStorage.save.and.stub();
    demoStorage.save.calls.reset();
    service.initializeForCurrentSession();
    service.createItem({
      title: 'New demo context',
      type: 'scientific',
      tags: [],
    });

    expect(demoStorage.save).toHaveBeenCalledTimes(1);
  });

  it('preserves the existing optimistic create flow for real sessions', () => {
    demoMode = false;
    realToken = 'real-token';
    const response$ = new Subject<WorkspaceItem>();
    const savedItem = createItem('backend-id');
    api.createItem.and.returnValue(response$);
    createService();

    service.createItem({
      title: 'Backend',
      type: 'scientific',
      tags: [],
    });
    const temporaryId = service.workspaceItems$.value[0].id;

    expect(temporaryId).not.toBe(savedItem.id);
    expect(api.createItem).toHaveBeenCalledTimes(1);

    response$.next(savedItem);
    expect(service.workspaceItems$.value).toEqual([savedItem]);
    expect(service.activeItemId$.value).toBe(savedItem.id);
    expect(demoStorage.save).not.toHaveBeenCalled();
  });

  it('persists active item selection and clearing in demo', () => {
    const item = createItem('demo-item');
    setDemoSnapshot(snapshot([item], null));
    createService();

    service.setActiveItem(item.id);
    expect(latestSnapshot().activeItemId).toBe(item.id);

    service.clearActiveItem();
    expect(latestSnapshot().activeItemId).toBeNull();
    expect(demoStorage.save).toHaveBeenCalledTimes(2);
  });

  it('updates and persists tags in demo without calling the API', () => {
    loadDemoItem();

    service.updateTags('demo-item', ['álgebra', 'offline']);

    expect(latestSnapshot().items[0].tags).toEqual(['álgebra', 'offline']);
    expect(api.updateTags).not.toHaveBeenCalled();
  });

  it('persists every expression mutation in demo without calling the API', () => {
    loadDemoItem();

    service.updateExpression('demo-item', '1');
    expect(latestSnapshot().items[0].currentExpression).toBe('1');

    service.updateCurrentExpression('demo-item', '2');
    expect(latestSnapshot().items[0].currentExpression).toBe('2');

    service.appendToCurrentExpression('demo-item', '+3');
    expect(latestSnapshot().items[0].currentExpression).toBe('2+3');

    service.clearCurrentExpression('demo-item');
    expect(latestSnapshot().items[0].currentExpression).toBe('');
    expect(demoStorage.save).toHaveBeenCalledTimes(4);
    expect(api.updateExpression).not.toHaveBeenCalled();
  });

  it('deletes and persists an item locally in demo without calling the API', () => {
    loadDemoItem();

    service.deleteItem('demo-item');

    expect(service.workspaceItems$.value).toEqual([]);
    expect(service.activeItemId$.value).toBeNull();
    expect(latestSnapshot().items).toEqual([]);
    expect(latestSnapshot().activeItemId).toBeNull();
    expect(api.deleteItem).not.toHaveBeenCalled();
  });

  it('adds a calculation, clears the expression and persists it in demo', () => {
    const item = createItem('demo-item', '2+i');
    setDemoSnapshot(snapshot([item], item.id));
    createService();
    const result = new Complex(2, 1);
    const calculation: WorkspaceCalculation = {
      id: 'calculation-1',
      expression: '2+i',
      result,
      steps: [
        {
          type: 'Operator',
          name: '+',
          operands: [2, new Complex(0, 1)],
          result,
        },
      ],
      timestamp: new Date('2026-01-03T12:00:00.000Z'),
    };

    service.addCalculationToActiveItem(calculation);

    const savedItem = latestSnapshot().items[0];
    expect(savedItem.currentExpression).toBe('');
    expect(savedItem.calculations).toEqual([calculation]);
    expect(savedItem.calculations[0].steps.length).toBe(1);
    expect(api.addCalculationDTO).not.toHaveBeenCalled();
  });

  it('clears visible demo state and loads backend data when switching to real', () => {
    const demoItem = createItem('demo-item');
    const realItem = createItem('real-item');
    setDemoSnapshot(snapshot([demoItem], demoItem.id));
    createService();

    demoMode = false;
    realToken = 'real-token';
    api.getItems.and.returnValue(of([realItem]));
    service.initializeForCurrentSession();

    expect(service.workspaceItems$.value).toEqual([realItem]);
    expect(service.activeItemId$.value).toBeNull();
    expect(api.getItems).toHaveBeenCalledTimes(1);
  });

  it('ignores a late real response after switching to demo', () => {
    demoMode = false;
    realToken = 'real-token';
    const response$ = new Subject<WorkspaceItem[]>();
    api.getItems.and.returnValue(response$);
    createService();

    const demoItem = createItem('demo-item');
    setDemoSnapshot(snapshot([demoItem], demoItem.id));
    demoMode = true;
    realToken = null;
    service.initializeForCurrentSession();

    response$.next([createItem('late-real-item')]);

    expect(service.workspaceItems$.value).toEqual([demoItem]);
    expect(service.activeItemId$.value).toBe(demoItem.id);
  });

  function createService(): void {
    TestBed.configureTestingModule({
      providers: [
        WorkspaceService,
        CalculationMapper,
        { provide: WorkspaceApiService, useValue: api },
        { provide: AuthSessionService, useValue: authSession },
        { provide: DemoWorkspaceStorageService, useValue: demoStorage },
        { provide: ToastService, useValue: toast },
      ],
    });
    service = TestBed.inject(WorkspaceService);
  }

  function loadDemoItem(): void {
    const item = createItem('demo-item');
    setDemoSnapshot(snapshot([item], item.id));
    createService();
  }

  function setDemoSnapshot(value: DemoWorkspaceSnapshot): void {
    demoStorage.loadWithDiagnostics.and.returnValue({ snapshot: value });
  }

  function latestSnapshot(): DemoWorkspaceSnapshot {
    return demoStorage.save.calls.mostRecent().args[0];
  }

  function emptySnapshot(): DemoWorkspaceSnapshot {
    return snapshot([], null);
  }

  function snapshot(
    items: WorkspaceItem[],
    activeItemId: string | null
  ): DemoWorkspaceSnapshot {
    return { version: 1, activeItemId, items };
  }

  function createItem(id: string, currentExpression = ''): WorkspaceItem {
    return {
      id,
      title: `Workspace ${id}`,
      type: 'scientific',
      currentExpression,
      calculations: [],
      tags: [],
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-02T11:00:00.000Z'),
    };
  }
});
