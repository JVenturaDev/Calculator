import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import Complex from 'complex.js';

import {
  CalculationDTO,
  WorkspaceCalculation,
  WorkspaceItem,
} from '../../components/work-space/work-space';
import { AuthSessionService } from '../auth/auth-session';
import { CalculationParserService } from '../calculation/calculation-parser';
import { CalculationMapper } from '../mappers/calculation-mapper';
import { ToastService } from '../toast-services/toast';
import { WorkspaceApiService } from '../workspace-api-service/workspace-api-service';
import {
  DemoWorkspaceSnapshot,
  DemoWorkspaceStorageService,
} from './demo-workspace-storage';
import { WorkspaceService } from './workspace-service';

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

  it('normalizes nullable expressions, calculations and tags loaded from the backend', () => {
    demoMode = false;
    realToken = 'real-token';
    api.getItems.and.returnValue(of([
      {
        ...createItem('nullable-real-item'),
        currentExpression: null,
        calculations: null,
        tags: null,
      } as unknown as WorkspaceItem,
    ]));

    createService();

    const loaded = service.workspaceItems$.value[0];
    expect(loaded.currentExpression).toBe('');
    expect(loaded.calculations).toEqual([]);
    expect(loaded.tags).toEqual([]);
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

  it('normalizes nullable fields returned after creating a real item', () => {
    demoMode = false;
    realToken = 'real-token';
    api.createItem.and.returnValue(of({
      ...createItem('backend-id'),
      currentExpression: null,
      calculations: null,
      tags: null,
    } as unknown as WorkspaceItem));
    createService();

    service.createItem({
      title: 'Backend nullable',
      type: 'scientific',
      tags: [],
    });

    const created = service.workspaceItems$.value[0];
    expect(created.id).toBe('backend-id');
    expect(created.currentExpression).toBe('');
    expect(created.calculations).toEqual([]);
    expect(created.tags).toEqual([]);
  });

  it('preserves text entered while the create request is pending', () => {
    demoMode = false;
    realToken = 'real-token';
    const response$ = new Subject<WorkspaceItem>();
    api.createItem.and.returnValue(response$);
    createService();

    service.createItem({
      title: 'Pending backend item',
      type: 'scientific',
      tags: [],
    });
    const temporaryId = service.workspaceItems$.value[0].id;
    service.updateCurrentExpression(temporaryId, '2+2');

    response$.next({
      ...createItem('backend-id'),
      currentExpression: null,
      calculations: null,
    } as unknown as WorkspaceItem);

    const created = service.workspaceItems$.value[0];
    expect(created.id).toBe('backend-id');
    expect(created.currentExpression).toBe('2+2');
    expect(created.calculations).toEqual([]);
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

  it('appends to a nullable expression without producing a null prefix', () => {
    const item = {
      ...createItem('nullable-demo-item'),
      currentExpression: null,
    } as unknown as WorkspaceItem;
    setDemoSnapshot(snapshot([item], item.id));
    createService();

    service.appendToCurrentExpression(item.id, '2');

    expect(service.workspaceItems$.value[0].currentExpression).toBe('2');
    expect(latestSnapshot().items[0].currentExpression).toBe('2');
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

  it('adds a calculation when calculations is null and clears the expression', () => {
    const item = {
      ...createItem('nullable-calculations', '2+2'),
      calculations: null,
    } as unknown as WorkspaceItem;
    setDemoSnapshot(snapshot([item], item.id));
    createService();
    const calculation: WorkspaceCalculation = {
      id: 'calculation-1',
      expression: '2+2',
      result: 4,
      steps: [],
      timestamp: new Date('2026-01-03T12:00:00.000Z'),
    };

    expect(() => service.addCalculationToActiveItem(calculation)).not.toThrow();

    const updated = service.workspaceItems$.value[0];
    expect(updated.calculations).toEqual([calculation]);
    expect(updated.currentExpression).toBe('');
  });

  it('allows a newly created real item to calculate without reloading', () => {
    demoMode = false;
    realToken = 'real-token';
    api.createItem.and.returnValue(of({
      ...createItem('backend-id'),
      currentExpression: null,
      calculations: null,
    } as unknown as WorkspaceItem));
    api.addCalculationDTO.and.returnValue(new Subject<CalculationDTO>());
    createService();

    service.createItem({
      title: 'Immediate calculation',
      type: 'scientific',
      tags: [],
    });
    service.updateCurrentExpression('backend-id', '2+2');

    const calculation: WorkspaceCalculation = {
      id: 'calculation-1',
      expression: '2+2',
      result: 4,
      steps: [],
      timestamp: new Date('2026-01-03T12:00:00.000Z'),
    };
    expect(() => service.addCalculationToActiveItem(calculation)).not.toThrow();

    const updated = service.workspaceItems$.value[0];
    expect(updated.calculations).toEqual([calculation]);
    expect(updated.currentExpression).toBe('');
    expect(api.addCalculationDTO).toHaveBeenCalledTimes(1);
  });

  it('normalizes optimistic and backend multi-step pi values identically', () => {
    demoMode = false;
    realToken = 'real-token';
    const item = createItem('real-item', '(Ï€+1)*2');
    api.getItems.and.returnValue(of([item]));
    const response$ = new Subject<CalculationDTO>();
    api.addCalculationDTO.and.returnValue(response$);
    createService();
    service.setActiveItem(item.id);

    const intermediate = new Complex(Math.PI + 1, 0);
    const finalResult = intermediate.mul(2);
    const calculation: WorkspaceCalculation = {
      id: 'optimistic-calculation',
      expression: '(Ï€+1)*2',
      result: finalResult,
      steps: [
        {
          type: 'Operator',
          name: '+',
          operands: [Math.PI, 1],
          result: intermediate,
        },
        {
          type: 'Operator',
          name: '*',
          operands: [intermediate, 2],
          result: finalResult,
        },
      ],
      timestamp: new Date('2026-01-03T12:00:00.000Z'),
    };

    service.addCalculationToActiveItem(calculation);

    const optimistic =
      service.workspaceItems$.value[0].calculations[0];
    expect(optimistic.result).toBeInstanceOf(Complex);
    expect(optimistic.steps[1].operands[0]).toBeInstanceOf(Complex);
    expect(optimistic.steps[1].result).toBeInstanceOf(Complex);

    response$.next({
      id: 'backend-calculation',
      expression: '(Ï€+1)*2',
      result: JSON.stringify({
        type: 'complex',
        re: finalResult.re,
        im: finalResult.im,
      }),
      steps: [
        {
          type: 'Operator',
          name: '+',
          operands: [Math.PI, 1],
          result: {
            type: 'complex',
            re: intermediate.re,
            im: intermediate.im,
          },
        },
        {
          type: 'Operator',
          name: '*',
          operands: [{ re: intermediate.re, im: intermediate.im }, 2],
          result: { re: finalResult.re, im: finalResult.im },
        },
      ],
      timestamp: '2026-01-03T12:00:01.000Z',
    } as unknown as CalculationDTO);

    const normalized =
      service.workspaceItems$.value[0].calculations[0];
    const formatter = TestBed.inject(CalculationParserService);

    expect(normalized.id).toBe('backend-calculation');
    expect(normalized.timestamp).toEqual(
      new Date('2026-01-03T12:00:01.000Z')
    );
    expect(normalized.result).toBeInstanceOf(Complex);
    expect(normalized.steps[0].result).toBeInstanceOf(Complex);
    expect(normalized.steps[1].operands[0]).toBeInstanceOf(Complex);
    expect(normalized.steps[1].result).toBeInstanceOf(Complex);
    expect(
      normalized.steps.flatMap(step => [
        ...step.operands.map(value => formatter.formatValue(value)),
        formatter.formatValue(step.result),
      ])
    ).not.toContain('[object Object]');
  });

  it('normalizes calculations equivalently from GET and create POST responses', () => {
    demoMode = false;
    realToken = 'real-token';
    const rawCalculation = {
      id: 'backend-calculation',
      expression: '(Ï€+1)*2',
      result: JSON.stringify({ type: 'real', value: 8.283185307179586 }),
      steps: [
        {
          type: 'Operator',
          name: '+',
          operands: [Math.PI, 1],
          result: { re: Math.PI + 1, im: 0 },
        },
        {
          type: 'Operator',
          name: '*',
          operands: [{ re: Math.PI + 1, im: 0 }, 2],
          result: { re: 8.283185307179586, im: 0 },
        },
      ],
      timestamp: '2026-01-03T12:00:00.000Z',
    } as unknown as WorkspaceCalculation;
    const loadedItem = {
      ...createItem('loaded-item'),
      calculations: [rawCalculation],
    };
    api.getItems.and.returnValue(of([loadedItem]));
    createService();
    const loadedCalculation =
      service.workspaceItems$.value[0].calculations[0];

    api.createItem.and.returnValue(of({
      ...createItem('created-item'),
      calculations: [rawCalculation],
    }));
    service.createItem({
      title: 'Created item',
      type: 'scientific',
      tags: [],
    });
    const createdCalculation =
      service.workspaceItems$.value[1].calculations[0];

    expect(createdCalculation.result).toEqual(loadedCalculation.result);
    expect(createdCalculation.timestamp).toEqual(loadedCalculation.timestamp);
    expect(createdCalculation.steps[0].result).toBeInstanceOf(Complex);
    expect(createdCalculation.steps[1].operands[0]).toBeInstanceOf(Complex);
    expect(createdCalculation.steps).toEqual(loadedCalculation.steps);
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
