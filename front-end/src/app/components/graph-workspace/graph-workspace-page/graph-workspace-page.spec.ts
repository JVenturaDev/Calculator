import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, Observable } from 'rxjs';

import { GraphWorkspacePageComponent } from './graph-workspace-page';
import { type GraphCanvasHover } from '../graph-canvas/graph-canvas';
import {
  GraphWorkspaceInspectorSummary,
} from '../graph-workspace-inspector/graph-workspace-inspector';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import {
  GraphFunctionSample,
} from '../../../services/graph-workspace/graph-sampling';
import {
  GraphFunction,
  GraphViewport2D,
  GraphWorkspaceState,
} from '../../../services/graph-workspace/graph-workspace-state';
import {
  GraphWorkspaceSamplingViewModel,
  GraphWorkspaceSamplingViewModelService,
} from '../../../services/graph-workspace/graph-workspace-sampling-view-model';

@Component({
  selector: 'app-graph-canvas-container',
  standalone: true,
  template: '<div class="canvas-stub"></div>',
})
class GraphCanvasContainerStubComponent {
  hoveredPoint: GraphCanvasHover | null = null;
}

@Component({
  selector: 'app-graph-canvas-container-3d',
  standalone: true,
  template: '<div class="canvas-3d-stub"></div>',
})
class GraphCanvasContainer3DStubComponent {
  @Input() ariaLabel = '';
}

@Component({
  selector: 'app-graph-workspace-inspector',
  standalone: true,
  template: '<div class="inspector-stub"></div>',
})
class GraphWorkspaceInspectorStubComponent {
  @Input() selectedFunction: GraphFunction | null = null;
  @Input() selectedSample: GraphFunctionSample | null = null;
  @Input({ required: true }) viewport!: GraphViewport2D;
  @Input({ required: true }) summary!: GraphWorkspaceInspectorSummary;
  @Input() error: string | null = null;
  @Input() hoveredPoint: GraphCanvasHover | null = null;
}

describe('GraphWorkspacePageComponent', () => {
  let fixture: ComponentFixture<GraphWorkspacePageComponent>;
  let stateSubject: BehaviorSubject<GraphWorkspaceState>;
  let vmSubject: BehaviorSubject<GraphWorkspaceSamplingViewModel>;
  let facade: FakeGraphWorkspaceFacade;

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<GraphWorkspaceState>(
      createState({ functions: [] })
    );
    vmSubject = new BehaviorSubject<GraphWorkspaceSamplingViewModel>(
      createViewModel(createState({ functions: [] }))
    );
    facade = {
      state$: stateSubject.asObservable(),
      addFunction: jasmine.createSpy('addFunction'),
      updateExpression: jasmine.createSpy('updateExpression'),
      updateLabel: jasmine.createSpy('updateLabel'),
      duplicateFunction: jasmine.createSpy('duplicateFunction'),
      toggleFunction: jasmine.createSpy('toggleFunction'),
      setPlotKind: jasmine.createSpy('setPlotKind'),
      removeFunction: jasmine.createSpy('removeFunction'),
      selectFunction: jasmine.createSpy('selectFunction'),
      setViewMode: jasmine.createSpy('setViewMode'),
      clear: jasmine.createSpy('clear'),
    };

    await TestBed.configureTestingModule({
      imports: [GraphWorkspacePageComponent],
      providers: [
        { provide: GraphWorkspaceFacade, useValue: facade },
        {
          provide: GraphWorkspaceSamplingViewModelService,
          useValue: { vm$: vmSubject.asObservable() },
        },
      ],
    })
      .overrideComponent(GraphWorkspacePageComponent, {
        set: {
          imports: [
            CommonModule,
            GraphCanvasContainerStubComponent,
            GraphCanvasContainer3DStubComponent,
            GraphWorkspaceInspectorStubComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GraphWorkspacePageComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vmSubject.complete();
    stateSubject.complete();
  });

  it('renders the Graph Workspace title', () => {
    expect(nativeElement().querySelector('h1')?.textContent?.trim())
      .toBe('Graph Workspace');
  });

  it('renders GraphCanvasContainerComponent', () => {
    expect(nativeElement().querySelector('app-graph-canvas-container'))
      .not.toBeNull();
  });

  it('renders the 2D/3D mode toolbar', () => {
    const buttons = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('.gw-mode-switch__button')
    );

    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent?.trim()).toBe('2D');
    expect(buttons[1].textContent?.trim()).toBe('3D');
  });

  it('marks the active visual mode', () => {
    emitState(createState({ functions: [], viewMode: '3d' }));

    const buttons = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('.gw-mode-switch__button')
    );

    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('switches to 2D from the toolbar', () => {
    click('.gw-mode-switch__button:first-of-type');

    expect(facade.setViewMode).toHaveBeenCalledOnceWith('2d');
  });

  it('switches to 3D from the toolbar', () => {
    click('.gw-mode-switch__button:last-of-type');

    expect(facade.setViewMode).toHaveBeenCalledOnceWith('3d');
  });

  it('does not clear the workspace when changing the mode', () => {
    click('.gw-mode-switch__button:last-of-type');
    click('.gw-mode-switch__button:first-of-type');

    expect(facade.clear).not.toHaveBeenCalled();
  });

  it('renders only the 2D canvas when 2D is active', () => {
    emitState(createState({ functions: [], viewMode: '2d' }));

    expect(nativeElement().querySelector('app-graph-canvas-container'))
      .not.toBeNull();
    expect(nativeElement().querySelector('app-graph-canvas-container-3d'))
      .toBeNull();
  });

  it('renders only the 3D canvas when 3D is active', () => {
    emitState(createState({ functions: [], viewMode: '3d' }));

    expect(nativeElement().querySelector('app-graph-canvas-container'))
      .toBeNull();
    expect(nativeElement().querySelector('app-graph-canvas-container-3d'))
      .not.toBeNull();
  });

  it('renders the graph inspector', () => {
    expect(nativeElement().querySelector('app-graph-workspace-inspector'))
      .not.toBeNull();
  });

  it('shows an empty state', () => {
    expect(nativeElement().querySelector('.gw-empty')?.textContent)
      .toContain('Aún no hay funciones');
  });

  it('does not render common mojibake fragments', () => {
    expectNoCorruptText(nativeElement().textContent ?? '');
  });

  it('adds a function from the toolbar button', () => {
    click('.gw-add');

    expect(facade.addFunction).toHaveBeenCalledTimes(1);
  });

  it('renders existing functions', () => {
    emitState(createState({
      functions: [graphFunction('fn-1'), graphFunction('fn-2')],
    }));

    const cards = nativeElement().querySelectorAll('.gf-card');
    const labelInputs = nativeElement().querySelectorAll<HTMLInputElement>(
      '.gf-name'
    );
    const expressionInputs = nativeElement().querySelectorAll<HTMLInputElement>(
      '.gf-expr input[type="text"]'
    );

    expect(cards.length).toBe(2);
    expect(labelInputs.length).toBe(2);
    expect(expressionInputs.length).toBe(2);
    expect(labelInputs[0].value).toBe('f1');
    expect(labelInputs[1].value).toBe('f2');
    expect(expressionInputs[0].getAttribute('aria-label'))
      .toBe('Expresión de f1');
    expect(expressionInputs[1].getAttribute('aria-label'))
      .toBe('Expresión de f2');
  });

  it('updates an expression from the input', () => {
    emitState(createState({
      functions: [graphFunction('fn-1')],
    }));

    const input = nativeElement()
      .querySelector<HTMLInputElement>('#graph-expression-fn-1')!;
    input.value = 'sin(x)';
    input.dispatchEvent(new Event('input'));

    expect(facade.updateExpression).toHaveBeenCalledOnceWith(
      'fn-1',
      'sin(x)'
    );
  });

  it('updates a label from the label input', () => {
    emitState(createState({
      functions: [graphFunction('fn-1')],
    }));

    const input = nativeElement()
      .querySelector<HTMLInputElement>('#graph-label-fn-1')!;
    input.value = '  g1  ';
    input.dispatchEvent(new Event('input'));

    expect(facade.updateLabel).toHaveBeenCalledOnceWith('fn-1', '  g1  ');
  });

  it('toggles function visibility', () => {
    emitState(createState({
      functions: [graphFunction('fn-1')],
    }));

    click('[aria-label="Ocultar f1"]');

    expect(facade.toggleFunction).toHaveBeenCalledOnceWith('fn-1');
  });

  it('changes the plot kind', () => {
    emitState(createState({
      functions: [graphFunction('fn-1')],
    }));

    const select = nativeElement()
      .querySelector<HTMLSelectElement>('select[aria-label="Tipo de gráfica para f1"]')!;
    select.value = 'contour';
    select.dispatchEvent(new Event('change'));

    expect(facade.setPlotKind).toHaveBeenCalledOnceWith('fn-1', 'contour');
  });

  it('duplicates a function from the row action', () => {
    emitState(createState({
      functions: [graphFunction('fn-1')],
    }));

    click('[aria-label="Duplicar f1"]');

    expect(facade.duplicateFunction).toHaveBeenCalledOnceWith('fn-1');
  });

  it('removes a function', () => {
    emitState(createState({
      functions: [graphFunction('fn-1')],
    }));

    click('[aria-label="Eliminar f1"]');

    expect(facade.removeFunction).toHaveBeenCalledOnceWith('fn-1');
  });

  it('selects a function from the row action', () => {
    emitState(createState({
      functions: [graphFunction('fn-1')],
    }));

    click('[aria-label="Seleccionar f1"]');

    expect(facade.selectFunction).toHaveBeenCalledOnceWith('fn-1');
  });

  it('renders the color swatch', () => {
    emitState(createState({
      functions: [graphFunction('fn-1', { color: '#ff7eb6' })],
    }));

    const swatch = nativeElement()
      .querySelector<HTMLElement>('.gf-color')!;
    expect(swatch.style.background).toBe('rgb(255, 126, 182)');
  });

  it('marks the selected function', () => {
    emitState(createState({
      functions: [graphFunction('fn-1')],
      selectedFunctionId: 'fn-1',
    }));

    expect(nativeElement().querySelector('.gf-card')
      ?.classList.contains('gf-card--selected')).toBeTrue();
    expect(nativeElement().querySelector('[aria-label="Seleccionar f1"]')
      ?.getAttribute('aria-pressed')).toBe('true');
  });

  it('passes selected function and sample to the inspector', () => {
    const selectedFunction = graphFunction('fn-1');
    const selectedSample = readySample('fn-1');
    vmSubject.next(createViewModel(
      createState({
        functions: [selectedFunction],
        selectedFunctionId: 'fn-1',
      }),
      {
        samples: [selectedSample],
        selectedFunction,
        selectedSample,
        readyFunctions: 1,
      }
    ));

    fixture.detectChanges();

    const inspector = fixture.debugElement.query(
      By.directive(GraphWorkspaceInspectorStubComponent)
    ).componentInstance as GraphWorkspaceInspectorStubComponent;
    expect(inspector.selectedFunction).toBe(selectedFunction);
    expect(inspector.selectedSample).toBe(selectedSample);
    expect(inspector.summary).toEqual({
      totalFunctions: 1,
      visibleFunctions: 1,
      readyFunctions: 1,
      invalidFunctions: 0,
      unsupportedFunctions: 0,
    });
  });

  it('passes the transient hovered point from the canvas container to the inspector', () => {
    const hoveredPoint: GraphCanvasHover = {
      functionId: 'fn-1',
      x: 1,
      y: 2,
    };
    const canvas = fixture.debugElement.query(
      By.directive(GraphCanvasContainerStubComponent)
    ).componentInstance as GraphCanvasContainerStubComponent;
    canvas.hoveredPoint = hoveredPoint;

    fixture.detectChanges();

    const inspector = fixture.debugElement.query(
      By.directive(GraphWorkspaceInspectorStubComponent)
    ).componentInstance as GraphWorkspaceInspectorStubComponent;
    expect(inspector.hoveredPoint).toBe(hoveredPoint);
  });

  it('uses accessible labels and button types', () => {
    emitState(createState({
      functions: [graphFunction('fn-1')],
    }));

    const expressionInput = nativeElement()
      .querySelector<HTMLInputElement>('#graph-expression-fn-1')!;
    const labelInput = nativeElement()
      .querySelector<HTMLInputElement>('#graph-label-fn-1')!;
    const buttons = Array.from(nativeElement().querySelectorAll('button'));

    expect(expressionInput.getAttribute('aria-label'))
      .toBe('Expresión de f1');
    expect(labelInput.getAttribute('aria-label')).toBe('Etiqueta de f1');
    expect(expressionInput).not.toBeNull();
    expect(labelInput).not.toBeNull();
    expect(buttons.every(button => button.getAttribute('type') === 'button'))
      .toBeTrue();
    expect(nativeElement().querySelector('[aria-label="Duplicar f1"]'))
      .not.toBeNull();
  });

  it('does not require CalculationEngine, GraphicPlotService or Plotly', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('shows 3D compatibility hints when 3D is active and line functions exist', () => {
    emitState(createState({
      viewMode: '3d',
      functions: [
        graphFunction('fn-1', { plotKind: 'line' }),
        graphFunction('fn-2', { plotKind: 'contour' }),
      ],
    }));

    const text = nativeElement().textContent ?? '';

    expect(text).toContain('Vista 3D activa');
    expect(text).toContain('Line no está disponible en la vista 3D');
    expect(text).toContain('superficies z = f(x, y)');
  });

  it('does not show the 3D line warning when no line functions exist', () => {
    emitState(createState({
      viewMode: '3d',
      functions: [graphFunction('fn-1', { plotKind: 'contour' })],
    }));

    expect(nativeElement().textContent ?? '')
      .not.toContain('Line no está disponible en la vista 3D');
  });

  function click(selector: string): void {
    const element = nativeElement().querySelector<HTMLElement>(selector);
    expect(element).withContext(selector).not.toBeNull();
    element!.click();
    fixture.detectChanges();
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function expectNoCorruptText(text: string): void {
    const corruptFragments = [
      `A${'\u00c3'}`,
      `funci${'\u00c3'}`,
      `gr${'\u00c3'}`,
      `Expresi${'\u00c3'}`,
    ];

    for (const fragment of corruptFragments) {
      expect(text).not.toContain(fragment);
    }
  }

  function emitState(state: GraphWorkspaceState): void {
    stateSubject.next(state);
    vmSubject.next(createViewModel(state));
    fixture.detectChanges();
  }

  function createViewModel(
    state: GraphWorkspaceState,
    overrides: Partial<GraphWorkspaceSamplingViewModel> = {}
  ): GraphWorkspaceSamplingViewModel {
    return {
      state,
      samples: [],
      selectedFunction: null,
      selectedSample: null,
      viewport: state.viewport,
      hasFunctions: state.functions.length > 0,
      visibleFunctions: state.functions.filter(graphFunction =>
        graphFunction.visible
      ).length,
      readyFunctions: 0,
      invalidFunctions: 0,
      unsupportedFunctions: 0,
      error: null,
      ...overrides,
    };
  }

  function createState(
    overrides: Partial<GraphWorkspaceState>
  ): GraphWorkspaceState {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const viewport2D = {
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
    };
    return {
      version: 2,
      id: 'graph-workspace-id',
      name: 'Graph Workspace',
      viewMode: '2d',
      functions: [],
      selectedFunctionId: null,
      viewport2D,
      viewport: viewport2D,
      scene3D: {
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
        zMin: -10,
        zMax: 10,
        camera: {
          eye: { x: 1.25, y: 1.25, z: 1.25 },
          up: { x: 0, y: 0, z: 1 },
          center: { x: 0, y: 0, z: 0 },
        },
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function graphFunction(
    id: string,
    overrides: Partial<GraphFunction> = {}
  ): GraphFunction {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    return {
      id,
      expression: 'x',
      label: id === 'fn-1' ? 'f1' : 'f2',
      color: '#78a9ff',
      visible: true,
      plotKind: 'line',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function readySample(functionId: string): GraphFunctionSample {
    return {
      functionId,
      status: 'ready',
      totalSamples: 2,
      invalidSamples: 0,
      trace: {
        kind: 'line',
        functionId,
        label: functionId,
        expression: 'x',
        color: '#78a9ff',
        x: [0, 1],
        y: [0, 1],
      },
    };
  }
});

interface FakeGraphWorkspaceFacade {
  readonly state$: Observable<GraphWorkspaceState>;
  readonly addFunction: jasmine.Spy;
  readonly updateExpression: jasmine.Spy;
  readonly updateLabel: jasmine.Spy;
  readonly duplicateFunction: jasmine.Spy;
  readonly toggleFunction: jasmine.Spy;
  readonly setPlotKind: jasmine.Spy;
  readonly removeFunction: jasmine.Spy;
  readonly selectFunction: jasmine.Spy;
  readonly setViewMode: jasmine.Spy;
  readonly clear: jasmine.Spy;
}
