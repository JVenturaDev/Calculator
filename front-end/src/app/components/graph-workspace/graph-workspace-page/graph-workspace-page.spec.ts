import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { GraphWorkspacePageComponent } from './graph-workspace-page';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import {
  GraphFunction,
  GraphWorkspaceState,
} from '../../../services/graph-workspace/graph-workspace-state';

@Component({
  selector: 'app-graph-canvas-container',
  standalone: true,
  template: '<div class="canvas-stub"></div>',
})
class GraphCanvasContainerStubComponent {}

describe('GraphWorkspacePageComponent', () => {
  let fixture: ComponentFixture<GraphWorkspacePageComponent>;
  let stateSubject: BehaviorSubject<GraphWorkspaceState>;
  let facade: FakeGraphWorkspaceFacade;

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<GraphWorkspaceState>(
      createState({ functions: [] })
    );
    facade = {
      state$: stateSubject.asObservable(),
      addFunction: jasmine.createSpy('addFunction'),
      updateExpression: jasmine.createSpy('updateExpression'),
      toggleFunction: jasmine.createSpy('toggleFunction'),
      setPlotKind: jasmine.createSpy('setPlotKind'),
      removeFunction: jasmine.createSpy('removeFunction'),
      selectFunction: jasmine.createSpy('selectFunction'),
    };

    await TestBed.configureTestingModule({
      imports: [GraphWorkspacePageComponent],
      providers: [{ provide: GraphWorkspaceFacade, useValue: facade }],
    })
      .overrideComponent(GraphWorkspacePageComponent, {
        set: {
          imports: [CommonModule, GraphCanvasContainerStubComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GraphWorkspacePageComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
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

  it('shows an empty state', () => {
    expect(nativeElement().querySelector('.graph-functions-empty')?.textContent)
      .toContain('Aún no hay funciones');
  });

  it('adds a function from the toolbar button', () => {
    click('.graph-workspace-add');

    expect(facade.addFunction).toHaveBeenCalledTimes(1);
  });

  it('renders existing functions', () => {
    stateSubject.next(createState({
      functions: [graphFunction('fn-1'), graphFunction('fn-2')],
    }));
    fixture.detectChanges();

    const cards = nativeElement().querySelectorAll('.graph-function-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('f1');
    expect(cards[1].textContent).toContain('f2');
  });

  it('updates an expression from the input', () => {
    stateSubject.next(createState({
      functions: [graphFunction('fn-1')],
    }));
    fixture.detectChanges();

    const input = nativeElement()
      .querySelector<HTMLInputElement>('#graph-expression-fn-1')!;
    input.value = 'sin(x)';
    input.dispatchEvent(new Event('input'));

    expect(facade.updateExpression).toHaveBeenCalledOnceWith(
      'fn-1',
      'sin(x)'
    );
  });

  it('toggles function visibility', () => {
    stateSubject.next(createState({
      functions: [graphFunction('fn-1')],
    }));
    fixture.detectChanges();

    click('[aria-label="Ocultar f1"]');

    expect(facade.toggleFunction).toHaveBeenCalledOnceWith('fn-1');
  });

  it('changes the plot kind', () => {
    stateSubject.next(createState({
      functions: [graphFunction('fn-1')],
    }));
    fixture.detectChanges();

    const select = nativeElement()
      .querySelector<HTMLSelectElement>('select[aria-label="Tipo de gráfica para f1"]')!;
    select.value = 'contour';
    select.dispatchEvent(new Event('change'));

    expect(facade.setPlotKind).toHaveBeenCalledOnceWith('fn-1', 'contour');
  });

  it('removes a function', () => {
    stateSubject.next(createState({
      functions: [graphFunction('fn-1')],
    }));
    fixture.detectChanges();

    click('[aria-label="Eliminar f1"]');

    expect(facade.removeFunction).toHaveBeenCalledOnceWith('fn-1');
  });

  it('selects a function from the row action', () => {
    stateSubject.next(createState({
      functions: [graphFunction('fn-1')],
    }));
    fixture.detectChanges();

    click('[aria-label="Seleccionar f1"]');

    expect(facade.selectFunction).toHaveBeenCalledOnceWith('fn-1');
  });

  it('renders the color swatch', () => {
    stateSubject.next(createState({
      functions: [graphFunction('fn-1', { color: '#ff7eb6' })],
    }));
    fixture.detectChanges();

    const swatch = nativeElement()
      .querySelector<HTMLElement>('.graph-function-color')!;
    expect(swatch.style.background).toBe('rgb(255, 126, 182)');
  });

  it('marks the selected function', () => {
    stateSubject.next(createState({
      functions: [graphFunction('fn-1')],
      selectedFunctionId: 'fn-1',
    }));
    fixture.detectChanges();

    expect(nativeElement().querySelector('.graph-function-card')
      ?.classList.contains('graph-function-card--selected')).toBeTrue();
    expect(nativeElement().querySelector('[aria-label="Seleccionar f1"]')
      ?.getAttribute('aria-pressed')).toBe('true');
  });

  it('uses accessible labels and button types', () => {
    stateSubject.next(createState({
      functions: [graphFunction('fn-1')],
    }));
    fixture.detectChanges();

    const input = nativeElement()
      .querySelector<HTMLInputElement>('#graph-expression-fn-1')!;
    const label = nativeElement()
      .querySelector<HTMLLabelElement>('label[for="graph-expression-fn-1"]')!;
    const buttons = Array.from(nativeElement().querySelectorAll('button'));

    expect(label.textContent).toContain('Expresión de f1');
    expect(input).not.toBeNull();
    expect(buttons.every(button => button.getAttribute('type') === 'button'))
      .toBeTrue();
  });

  it('does not require CalculationEngine, GraphicPlotService or Plotly', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
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

  function createState(
    overrides: Partial<GraphWorkspaceState>
  ): GraphWorkspaceState {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    return {
      version: 1,
      id: 'graph-workspace-id',
      name: 'Graph Workspace',
      functions: [],
      selectedFunctionId: null,
      viewport: {
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
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
});

interface FakeGraphWorkspaceFacade {
  readonly state$: GraphWorkspaceFacade['state$'];
  readonly addFunction: jasmine.Spy;
  readonly updateExpression: jasmine.Spy;
  readonly toggleFunction: jasmine.Spy;
  readonly setPlotKind: jasmine.Spy;
  readonly removeFunction: jasmine.Spy;
  readonly selectFunction: jasmine.Spy;
}
