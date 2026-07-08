import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  GraphWorkspaceInspectorComponent,
  GraphWorkspaceInspectorSummary,
} from './graph-workspace-inspector';
import {
  GraphFunctionSample,
} from '../../../services/graph-workspace/graph-sampling';
import {
  GraphFunction,
  GraphViewport2D,
} from '../../../services/graph-workspace/graph-workspace-state';

describe('GraphWorkspaceInspectorComponent', () => {
  let fixture: ComponentFixture<GraphWorkspaceInspectorComponent>;

  const viewport: GraphViewport2D = {
    xMin: -10,
    xMax: 10,
    yMin: -5,
    yMax: 5,
  };
  const summary: GraphWorkspaceInspectorSummary = {
    totalFunctions: 3,
    visibleFunctions: 2,
    readyFunctions: 1,
    invalidFunctions: 1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphWorkspaceInspectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphWorkspaceInspectorComponent);
    fixture.componentInstance.viewport = viewport;
    fixture.componentInstance.summary = summary;
    fixture.detectChanges();
  });

  it('shows an empty state and viewport when there is no selected function', () => {
    const text = nativeElement().textContent ?? '';

    expect(text).toContain('Selecciona una función para ver detalles.');
    expect(text).toContain('-10 → 10');
    expect(text).toContain('-5 → 5');
    expect(text).toContain('Funciones');
    expect(text).toContain('Visibles');
    expect(text).toContain('Listas');
    expect(text).toContain('Inválidas');
    expectNoCorruptText(text);
  });

  it('shows selected function data and sampling status', () => {
    fixture.componentInstance.selectedFunction = graphFunction();
    fixture.componentInstance.selectedSample = readySample();

    fixture.detectChanges();

    const text = nativeElement().textContent ?? '';
    expect(text).toContain('f1');
    expect(text).toContain('sin(x)');
    expect(text).toContain('#78a9ff');
    expect(text).toContain('Visible');
    expect(text).toContain('Line');
    expect(text).toContain('Lista');
    expect(text).toContain('400');
    expect(text).toContain('3');
    expectNoCorruptText(text);
  });

  it('renders the function color swatch', () => {
    fixture.componentInstance.selectedFunction = graphFunction({
      color: '#ff7eb6',
    });
    fixture.componentInstance.selectedSample = readySample();

    fixture.detectChanges();

    const swatch = nativeElement()
      .querySelector<HTMLElement>('.graph-inspector__swatch')!;
    expect(swatch.style.background).toBe('rgb(255, 126, 182)');
  });

  it('shows firstError when it exists', () => {
    fixture.componentInstance.selectedFunction = graphFunction();
    fixture.componentInstance.selectedSample = {
      ...readySample(),
      status: 'invalid',
      firstError: 'Unexpected token',
    };

    fixture.detectChanges();

    expect(nativeElement().textContent).toContain('Unexpected token');
  });

  it('shows a shared sampling error with aria-live', () => {
    fixture.componentInstance.error =
      'No se pudo muestrear el Workspace gráfico.';

    fixture.detectChanges();

    const error = nativeElement()
      .querySelector<HTMLElement>('.graph-inspector__error')!;
    expect(error.textContent?.trim())
      .toBe('No se pudo muestrear el Workspace gráfico.');
    expect(error.getAttribute('role')).toBe('status');
    expect(error.getAttribute('aria-live')).toBe('polite');
  });

  it('does not show unsupported analysis features', () => {
    const text = nativeElement().textContent ?? '';

    expect(text).not.toContain('Dominio');
    expect(text).not.toContain('Rango');
    expect(text).not.toContain('Derivada');
    expect(text).not.toContain('Intersecciones');
    expect(text).not.toContain('Export');
    expect(text).not.toContain('Filtros');
    expect(text).not.toContain('Variables');
    expect(text).not.toContain('domain');
    expect(text).not.toContain('range');
    expect(text).not.toContain('derivative');
    expect(text).not.toContain('intersections');
    expect(text).not.toContain('export');
    expect(text).not.toContain('filter');
    expect(text).not.toContain('variables');
  });

  it('uses headings for the inspector structure', () => {
    expect(nativeElement().querySelector('#graph-inspector-title')
      ?.textContent).toContain('Detalles gráficos');
  });

  it('does not render common mojibake fragments', () => {
    expectNoCorruptText(nativeElement().textContent ?? '');
  });

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function expectNoCorruptText(text: string): void {
    const corruptFragments = [
      `A${'\u00c3'}`,
      `funci${'\u00c3'}`,
      `gr${'\u00c3'}`,
      `Inv${'\u00c3'}`,
      '\u00e2\u2020',
    ];

    for (const fragment of corruptFragments) {
      expect(text).not.toContain(fragment);
    }
  }

  function graphFunction(
    overrides: Partial<GraphFunction> = {}
  ): GraphFunction {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    return {
      id: 'fn-1',
      expression: 'sin(x)',
      label: 'f1',
      color: '#78a9ff',
      visible: true,
      plotKind: 'line',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function readySample(): GraphFunctionSample {
    return {
      functionId: 'fn-1',
      status: 'ready',
      totalSamples: 400,
      invalidSamples: 3,
      trace: {
        kind: 'line',
        functionId: 'fn-1',
        label: 'f1',
        expression: 'sin(x)',
        color: '#78a9ff',
        x: [0, 1],
        y: [0, 1],
      },
    };
  }
});
