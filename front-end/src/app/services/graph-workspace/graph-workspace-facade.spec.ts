import { TestBed } from '@angular/core/testing';

import {
  BrowserGraphWorkspaceRepository,
  type GraphWorkspaceLoadResult,
} from './browser-graph-workspace-repository';
import {
  GRAPH_FUNCTION_COLORS,
  GRAPH_WORKSPACE_ID_GENERATOR,
  GraphWorkspaceFacade,
  MAX_GRAPH_FUNCTIONS,
} from './graph-workspace-facade';
import {
  DEFAULT_GRAPH_VIEWPORT,
  type GraphWorkspaceState,
} from './graph-workspace-state';

describe('GraphWorkspaceFacade', () => {
  let facade: GraphWorkspaceFacade;
  let repository: jasmine.SpyObj<BrowserGraphWorkspaceRepository>;
  let idGenerator: jasmine.Spy<() => string>;
  let nextId: number;

  beforeEach(() => {
    nextId = 0;
    repository = jasmine.createSpyObj<BrowserGraphWorkspaceRepository>(
      'BrowserGraphWorkspaceRepository',
      ['load', 'save', 'clear']
    );
    repository.load.and.returnValue({ state: null });
    idGenerator = jasmine.createSpy('graphWorkspaceIdGenerator')
      .and.callFake(() => `graph-id-${nextId++}`);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: BrowserGraphWorkspaceRepository,
          useValue: repository,
        },
        {
          provide: GRAPH_WORKSPACE_ID_GENERATOR,
          useValue: idGenerator,
        },
      ],
    });
    facade = TestBed.inject(GraphWorkspaceFacade);
  });

  it('creates the versioned initial workspace state', () => {
    expect(facade.snapshot.version).toBe(1);
    expect(facade.snapshot.id).toBe('graph-id-0');
    expect(facade.snapshot.name).toBe('Graph Workspace');
    expect(facade.snapshot.functions).toEqual([]);
    expect(facade.snapshot.selectedFunctionId).toBeNull();
    expect(facade.snapshot.viewport).toEqual(DEFAULT_GRAPH_VIEWPORT);
    expect(facade.snapshot.createdAt).toEqual(jasmine.any(Date));
    expect(facade.snapshot.updatedAt).toEqual(jasmine.any(Date));
    expect(repository.load).toHaveBeenCalledTimes(1);
    expect(repository.save).not.toHaveBeenCalled();
    expect(idGenerator).toHaveBeenCalledTimes(1);
  });

  it('hydrates the first state without saving or generating a workspace ID', () => {
    const hydratedState = createHydratedState();
    repository.load.calls.reset();
    repository.save.calls.reset();
    repository.load.and.returnValue({ state: hydratedState });
    idGenerator.calls.reset();

    const hydratedFacade = createFacade();
    let firstState: GraphWorkspaceState | undefined;
    const subscription = hydratedFacade.state$.subscribe(state => {
      firstState ??= state;
    });

    expect(repository.load).toHaveBeenCalledTimes(1);
    expect(repository.save).not.toHaveBeenCalled();
    expect(idGenerator).not.toHaveBeenCalled();
    expect(hydratedFacade.snapshot).toBe(hydratedState);
    expect(firstState).toBe(hydratedState);
    subscription.unsubscribe();
  });

  it('starts clean for corrupt, unsupported and unavailable storage', () => {
    const corruptError = new SyntaxError('Invalid JSON');
    const unavailableError = new DOMException(
      'Storage blocked',
      'SecurityError'
    );
    const consoleError = spyOn(console, 'error');
    const results: GraphWorkspaceLoadResult[] = [
      { state: null, issue: 'corrupt', error: corruptError },
      { state: null, issue: 'unsupported-version' },
      { state: null, issue: 'unavailable', error: unavailableError },
    ];
    repository.load.calls.reset();
    repository.save.calls.reset();
    idGenerator.calls.reset();

    const facades = results.map(result => {
      repository.load.and.returnValue(result);
      return createFacade();
    });

    expect(facades.every(current => current.snapshot.functions.length === 0))
      .toBeTrue();
    expect(facades.every(current => current.snapshot.id.startsWith('graph-id-')))
      .toBeTrue();
    expect(repository.load).toHaveBeenCalledTimes(3);
    expect(repository.save).not.toHaveBeenCalled();
    expect(idGenerator).toHaveBeenCalledTimes(3);
    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(consoleError.calls.argsFor(0)[1]).toBe(corruptError);
    expect(consoleError.calls.argsFor(1)[1]).toBe(unavailableError);
  });

  it('adds and selects a visible line function with an empty expression by default', () => {
    facade.addFunction();

    const graphFunction = facade.snapshot.functions[0];
    expect(graphFunction).toEqual(jasmine.objectContaining({
      id: 'graph-id-1',
      expression: '',
      label: 'f1',
      color: GRAPH_FUNCTION_COLORS[0],
      visible: true,
      plotKind: 'line',
    }));
    expect(facade.snapshot.selectedFunctionId).toBe(graphFunction.id);
  });

  it('assigns incremental labels and accessible palette colors', () => {
    facade.addFunction('x');
    facade.addFunction('x^2');
    facade.addFunction('sin(x)');

    expect(facade.snapshot.functions.map(({ label }) => label))
      .toEqual(['f1', 'f2', 'f3']);
    expect(facade.snapshot.functions.map(({ color }) => color))
      .toEqual(GRAPH_FUNCTION_COLORS.slice(0, 3));
  });

  it('updates only the requested expression', () => {
    facade.addFunction('x');
    facade.addFunction('x^2');
    const [first, second] = facade.snapshot.functions;

    facade.updateExpression(first.id, 'sin(x)');

    expect(facade.snapshot.functions[0].expression).toBe('sin(x)');
    expect(facade.snapshot.functions[1]).toBe(second);
  });

  it('removes functions and clears selection only when the selected one is removed', () => {
    facade.addFunction('x');
    facade.addFunction('x^2');
    const [first, second] = facade.snapshot.functions;

    facade.removeFunction(first.id);
    expect(facade.snapshot.selectedFunctionId).toBe(second.id);

    facade.removeFunction(second.id);
    expect(facade.snapshot.functions).toEqual([]);
    expect(facade.snapshot.selectedFunctionId).toBeNull();
  });

  it('toggles function visibility', () => {
    facade.addFunction('x');
    const id = facade.snapshot.functions[0].id;

    facade.toggleFunction(id);
    expect(facade.snapshot.functions[0].visible).toBeFalse();

    facade.toggleFunction(id);
    expect(facade.snapshot.functions[0].visible).toBeTrue();
  });

  it('accepts palette colors case-insensitively and ignores invalid colors', () => {
    facade.addFunction('x');
    const id = facade.snapshot.functions[0].id;

    facade.setColor(id, GRAPH_FUNCTION_COLORS[2].toUpperCase());
    expect(facade.snapshot.functions[0].color).toBe(
      GRAPH_FUNCTION_COLORS[2]
    );

    facade.setColor(id, 'red');
    expect(facade.snapshot.functions[0].color).toBe(
      GRAPH_FUNCTION_COLORS[2]
    );
  });

  it('changes a function from line to contour and persists it once', () => {
    facade.addFunction('x+y');
    const id = facade.snapshot.functions[0].id;
    repository.save.calls.reset();

    facade.setPlotKind(id, 'contour');

    expect(facade.snapshot.functions[0].plotKind).toBe('contour');
    expect(repository.save).toHaveBeenCalledOnceWith(facade.snapshot);
  });

  it('changes a function from contour back to line', () => {
    facade.addFunction('x+y');
    const id = facade.snapshot.functions[0].id;
    facade.setPlotKind(id, 'contour');
    repository.save.calls.reset();

    facade.setPlotKind(id, 'line');

    expect(facade.snapshot.functions[0].plotKind).toBe('line');
    expect(repository.save).toHaveBeenCalledOnceWith(facade.snapshot);
  });

  it('changes only plotKind while preserving function data and selection', () => {
    facade.addFunction('sin(x)');
    facade.addFunction('x+y');
    const [untouched, target] = facade.snapshot.functions;
    const preserved = {
      expression: target.expression,
      label: target.label,
      color: target.color,
      visible: target.visible,
    };
    const selection = facade.snapshot.selectedFunctionId;
    const workspaceUpdatedAt = facade.snapshot.updatedAt;
    const functionUpdatedAt = target.updatedAt;
    repository.save.calls.reset();

    facade.setPlotKind(target.id, 'contour');

    const updatedTarget = facade.snapshot.functions[1];
    expect(facade.snapshot.functions[0]).toBe(untouched);
    expect(updatedTarget).toEqual(jasmine.objectContaining(preserved));
    expect(updatedTarget.plotKind).toBe('contour');
    expect(facade.snapshot.selectedFunctionId).toBe(selection);
    expect(updatedTarget.updatedAt.getTime())
      .toBeGreaterThan(functionUpdatedAt.getTime());
    expect(facade.snapshot.updatedAt.getTime())
      .toBeGreaterThan(workspaceUpdatedAt.getTime());
  });

  it('does not persist an unknown ID, unchanged kind or invalid runtime kind', () => {
    facade.addFunction('x');
    const graphFunction = facade.snapshot.functions[0];
    const workspaceUpdatedAt = facade.snapshot.updatedAt;
    repository.save.calls.reset();

    facade.setPlotKind('missing', 'contour');
    facade.setPlotKind(graphFunction.id, 'line');
    facade.setPlotKind(
      graphFunction.id,
      'surface' as unknown as 'line'
    );

    expect(repository.save).not.toHaveBeenCalled();
    expect(facade.snapshot.functions[0]).toBe(graphFunction);
    expect(facade.snapshot.updatedAt).toBe(workspaceUpdatedAt);
  });

  it('keeps the previous snapshot immutable when changing plot kind', () => {
    facade.addFunction('x+y');
    const previousState = facade.snapshot;
    const previousFunction = previousState.functions[0];

    facade.setPlotKind(previousFunction.id, 'contour');

    expect(facade.snapshot).not.toBe(previousState);
    expect(facade.snapshot.functions).not.toBe(previousState.functions);
    expect(facade.snapshot.functions[0]).not.toBe(previousFunction);
    expect(previousFunction.plotKind).toBe('line');
    expect(facade.snapshot.functions[0].plotKind).toBe('contour');
  });

  it('selects existing functions, clears with null and ignores unknown IDs', () => {
    facade.addFunction('x');
    const id = facade.snapshot.functions[0].id;

    facade.selectFunction(null);
    expect(facade.snapshot.selectedFunctionId).toBeNull();

    facade.selectFunction('missing');
    expect(facade.snapshot.selectedFunctionId).toBeNull();

    facade.selectFunction(id);
    expect(facade.snapshot.selectedFunctionId).toBe(id);
  });

  it('updates the viewport with a defensive copy', () => {
    const viewport = { xMin: -20, xMax: 20, yMin: -5, yMax: 5 };

    facade.setViewport(viewport);

    expect(facade.snapshot.viewport).toEqual(viewport);
    expect(facade.snapshot.viewport).not.toBe(viewport);
  });

  it('resets an altered viewport to the default and persists it once', () => {
    facade.addFunction('x');
    const functionBeforeReset = facade.snapshot.functions[0];
    const selectedFunctionId = facade.snapshot.selectedFunctionId;
    facade.setViewport({ xMin: -20, xMax: 20, yMin: -8, yMax: 8 });
    const updatedAtBeforeReset = facade.snapshot.updatedAt;
    repository.save.calls.reset();

    facade.resetViewport();

    expect(facade.snapshot.viewport).toEqual(DEFAULT_GRAPH_VIEWPORT);
    expect(facade.snapshot.viewport).not.toBe(DEFAULT_GRAPH_VIEWPORT);
    expect(facade.snapshot.functions).toEqual([functionBeforeReset]);
    expect(facade.snapshot.selectedFunctionId).toBe(selectedFunctionId);
    expect(facade.snapshot.updatedAt.getTime())
      .toBeGreaterThan(updatedAtBeforeReset.getTime());
    expect(repository.save).toHaveBeenCalledOnceWith(facade.snapshot);
  });

  it('does not persist resetViewport when the viewport is already default', () => {
    const previousState = facade.snapshot;
    repository.save.calls.reset();

    facade.resetViewport();

    expect(facade.snapshot).toBe(previousState);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('ignores invalid viewports', () => {
    const initialViewport = facade.snapshot.viewport;

    facade.setViewport({ xMin: 10, xMax: -10, yMin: -5, yMax: 5 });

    expect(facade.snapshot.viewport).toBe(initialViewport);
  });

  it('clears functions and restores defaults without changing workspace identity', () => {
    const workspaceId = facade.snapshot.id;
    const createdAt = facade.snapshot.createdAt;
    facade.addFunction('x');
    facade.setViewport({ xMin: -2, xMax: 2, yMin: -3, yMax: 3 });

    facade.clear();

    expect(facade.snapshot.id).toBe(workspaceId);
    expect(facade.snapshot.createdAt).toBe(createdAt);
    expect(facade.snapshot.functions).toEqual([]);
    expect(facade.snapshot.selectedFunctionId).toBeNull();
    expect(facade.snapshot.viewport).toEqual(DEFAULT_GRAPH_VIEWPORT);
  });

  it('enforces the provisional function limit', () => {
    for (let index = 0; index < MAX_GRAPH_FUNCTIONS + 2; index++) {
      facade.addFunction(`x+${index}`);
    }

    expect(facade.snapshot.functions.length).toBe(MAX_GRAPH_FUNCTIONS);
    expect(facade.snapshot.functions.at(-1)?.label)
      .toBe(`f${MAX_GRAPH_FUNCTIONS}`);
  });

  it('keeps previous state snapshots immutable across mutations', () => {
    const initialState = facade.snapshot;
    const initialFunctions = initialState.functions;

    facade.addFunction('x');
    const stateAfterAdd = facade.snapshot;
    const functionAfterAdd = stateAfterAdd.functions[0];
    facade.updateExpression(functionAfterAdd.id, 'x^2');

    expect(facade.snapshot).not.toBe(stateAfterAdd);
    expect(facade.snapshot.functions).not.toBe(stateAfterAdd.functions);
    expect(initialState.functions).toBe(initialFunctions);
    expect(initialState.functions).toEqual([]);
    expect(functionAfterAdd.expression).toBe('x');
  });

  it('advances updatedAt for workspace and function mutations', () => {
    const initialUpdatedAt = facade.snapshot.updatedAt;
    facade.addFunction('x');
    const afterAdd = facade.snapshot.updatedAt;
    const id = facade.snapshot.functions[0].id;

    facade.updateExpression(id, 'x+1');

    expect(afterAdd.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    expect(facade.snapshot.updatedAt.getTime())
      .toBeGreaterThan(afterAdd.getTime());
    expect(facade.snapshot.functions[0].updatedAt)
      .toBe(facade.snapshot.updatedAt);
  });

  it('persists every valid mutation through the repository', () => {
    repository.save.calls.reset();

    facade.addFunction('x');
    expectCurrentStateSaved();
    const id = facade.snapshot.functions[0].id;

    facade.updateExpression(id, 'x^2');
    expectCurrentStateSaved();

    facade.toggleFunction(id);
    expectCurrentStateSaved();

    facade.setColor(id, GRAPH_FUNCTION_COLORS[1]);
    expectCurrentStateSaved();

    facade.selectFunction(null);
    expectCurrentStateSaved();

    facade.selectFunction(id);
    expectCurrentStateSaved();

    facade.setViewport({ xMin: -5, xMax: 5, yMin: -4, yMax: 4 });
    expectCurrentStateSaved();

    facade.removeFunction(id);
    expectCurrentStateSaved();
  });

  it('does not persist commands that do not change state', () => {
    facade.addFunction('x');
    const first = facade.snapshot.functions[0];
    for (let index = 1; index < MAX_GRAPH_FUNCTIONS; index++) {
      facade.addFunction(`x+${index}`);
    }
    const selectedId = facade.snapshot.selectedFunctionId;
    repository.save.calls.reset();

    facade.addFunction('limit');
    facade.updateExpression('missing', 'x');
    facade.updateExpression(first.id, first.expression);
    facade.removeFunction('missing');
    facade.toggleFunction('missing');
    facade.setColor('missing', GRAPH_FUNCTION_COLORS[1]);
    facade.setColor(first.id, 'red');
    facade.setColor(first.id, first.color);
    facade.selectFunction('missing');
    facade.selectFunction(selectedId);
    facade.setViewport({ xMin: 5, xMax: -5, yMin: -4, yMax: 4 });

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('clear persists an empty state without clearing the repository key', () => {
    facade.addFunction('x');
    repository.save.calls.reset();

    facade.clear();

    expect(repository.save).toHaveBeenCalledOnceWith(facade.snapshot);
    expect(repository.save.calls.mostRecent().args[0].functions).toEqual([]);
    expect(repository.clear).not.toHaveBeenCalled();
  });

  it('keeps the memory state when saving fails and does not propagate the error', () => {
    const storageError = new DOMException(
      'Quota exceeded',
      'QuotaExceededError'
    );
    repository.save.and.callFake(() => {
      throw storageError;
    });
    const consoleError = spyOn(console, 'error');

    expect(() => facade.addFunction('x')).not.toThrow();

    expect(facade.snapshot.functions.length).toBe(1);
    expect(facade.snapshot.functions[0].expression).toBe('x');
    expect(consoleError).toHaveBeenCalledWith(
      'Error saving Graph Workspace:',
      storageError
    );
  });

  function expectCurrentStateSaved(): void {
    expect(repository.save).toHaveBeenCalledOnceWith(facade.snapshot);
    repository.save.calls.reset();
  }

  function createFacade(): GraphWorkspaceFacade {
    return TestBed.runInInjectionContext(() => new GraphWorkspaceFacade());
  }

  function createHydratedState(): GraphWorkspaceState {
    const timestamp = new Date('2026-05-06T07:08:09.000Z');
    return {
      version: 1,
      id: 'persisted-workspace',
      name: 'Graph Workspace',
      functions: [
        {
          id: 'persisted-function',
          expression: 'sin(x)',
          label: 'f1',
          color: GRAPH_FUNCTION_COLORS[0],
          visible: true,
          plotKind: 'line',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      selectedFunctionId: 'persisted-function',
      viewport: { xMin: -4, xMax: 4, yMin: -3, yMax: 3 },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
});
