import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';

import { GraphicQuickPlotShellComponent } from './graphic-quick-plot-shell';
import {
  type GraphScene3D,
} from '../../services/graph-workspace/graph-workspace-state';
import {
  type GraphSurfaceSample,
} from '../../services/graph-workspace/graph-sampling-3d';
import { GraphFunctionSampler3DService } from '../../services/graph-workspace/graph-function-sampler-3d';
import { GraphicPlotService } from '../../services/plot-services/graphic-plot';

@Component({
  selector: 'app-graphic-plot',
  standalone: true,
  template: '<div class="graphic-plot-stub"></div>',
})
class GraphicPlotStubComponent {}

@Component({
  selector: 'app-graph-canvas-3d',
  standalone: true,
  template: '<div class="graph-canvas-3d-stub"></div>',
})
class GraphCanvas3DStubComponent {
  @Input() samples: readonly GraphSurfaceSample[] = [];
  @Input({ required: true }) scene!: GraphScene3D;
  @Input() selectedFunctionId: string | null = null;
  @Input() ariaLabel = '';
  @Output() readonly sceneChange = new EventEmitter<GraphScene3D>();
}

describe('GraphicQuickPlotShellComponent', () => {
  let fixture: ComponentFixture<GraphicQuickPlotShellComponent>;
  let expression$: BehaviorSubject<string>;
  let sampler3D: jasmine.SpyObj<GraphFunctionSampler3DService>;

  beforeEach(async () => {
    expression$ = new BehaviorSubject('');
    sampler3D = jasmine.createSpyObj<GraphFunctionSampler3DService>(
      'GraphFunctionSampler3DService',
      ['sampleFunction']
    );
    sampler3D.sampleFunction.and.returnValue(readySample());

    await TestBed.configureTestingModule({
      imports: [GraphicQuickPlotShellComponent],
      providers: [
        {
          provide: GraphicPlotService,
          useValue: { expression$: expression$.asObservable() },
        }, { provide: GraphFunctionSampler3DService, useValue: sampler3D },
      ],
    })
      .overrideComponent(GraphicQuickPlotShellComponent, {
        set: {
          imports: [
            CommonModule,
            GraphicPlotStubComponent,
            GraphCanvas3DStubComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GraphicQuickPlotShellComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    expression$.complete();
  });

  it('starts in 2D and does not mount the 3D canvas', () => {
    expect(fixture.componentInstance.viewMode).toBe('2d');
    expect(get2D()).not.toBeNull();
    expect(get3D()).toBeNull();
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[1].disabled).toBeTrue();
    expect(toolbar()?.getAttribute('aria-label')).toBe('Modo de visualización');
    expect(fixture.nativeElement.textContent).toContain('Visualización');
    expect(fixture.nativeElement.textContent).toContain('Gráfica rápida');
  });

  it('shows the 3D compatibility hint only when the 3D view is active', () => {
    expression$.next('x+y');
    fixture.detectChanges();

    buttons()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.viewMode).toBe('3d');
    expect(fixture.componentInstance.compatibilityMessage).toBeNull();
    expect(fixture.nativeElement.querySelector('.graphic-quick-shell__hint')).toBeNull();

    expression$.next('x');
    fixture.detectChanges();

    expect(fixture.componentInstance.compatibilityMessage).toBe('La vista 3D requiere una expresión que use x e y.');
    expect(fixture.nativeElement.querySelector('.graphic-quick-shell__hint')?.textContent?.trim())
      .toBe('La vista 3D requiere una expresión que use x e y.');
    expect(get2D()).toBeNull();
    expect(get3D()).not.toBeNull();
    expect(sampler3D.sampleFunction).not.toHaveBeenCalled();
  });

  it('enables 3D for x+y and samples once after the debounce window', fakeAsync(() => {
    expression$.next('x+y');
    fixture.detectChanges();

    expect(buttons()[1].disabled).toBeFalse();

    buttons()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.viewMode).toBe('3d');
    expect(get3D()).not.toBeNull();
    tick(122);
    fixture.detectChanges();
    expect(sampler3D.sampleFunction).toHaveBeenCalledTimes(1);
    expect(get3D()?.samples.length).toBe(1);
    expect(get2D()).toBeNull();
  }));

  it('switches back to 2D without losing the expression', fakeAsync(() => {
    expression$.next('x+y');
    fixture.detectChanges();

    buttons()[1].click();
    fixture.detectChanges();
    tick(122);
    fixture.detectChanges();

    buttons()[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.viewMode).toBe('2d');
    expect(fixture.componentInstance.expression).toBe('x+y');
    expect(get2D()).not.toBeNull();
    expect(get3D()).toBeNull();
  }));

  it('uses the tokenized detector and ignores y inside function names', () => {
    expression$.next('yroot(8)');
    fixture.detectChanges();

    expect(buttons()[1].disabled).toBeTrue();
    expect(fixture.componentInstance.compatibilityMessage).toBe('La vista 3D requiere una expresión que use x e y.');
  });

  it('keeps 3D disabled for empty and invalid expressions', () => {
    expression$.next('');
    fixture.detectChanges();
    expect(buttons()[1].disabled).toBeTrue();

    expression$.next('(');
    fixture.detectChanges();
    expect(buttons()[1].disabled).toBeTrue();
  });

  it('keeps loading and error messages accessible in 3D', () => {
    expression$.next('x+y');
    fixture.detectChanges();

    buttons()[1].click();
    fixture.detectChanges();

    fixture.componentInstance.viewMode = '3d';
    fixture.componentInstance.loading3D = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.graphic-quick-shell__status')?.textContent)
      .toContain('Cargando vista 3D…');

    fixture.componentInstance.loading3D = false;
    fixture.componentInstance.sampleError = 'No se pudo generar la vista 3D.';
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.graphic-quick-shell__error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent?.trim()).toBe('No se pudo generar la vista 3D.');
  });

  it('updates the 3D scene locally when the canvas emits changes', fakeAsync(() => {
    expression$.next('x+y');
    fixture.detectChanges();

    buttons()[1].click();
    fixture.detectChanges();
    tick(122);
    fixture.detectChanges();

    const canvas = get3D()!;
    const nextScene = {
      ...canvas.scene,
      xMin: -20,
      xMax: 20,
    };
    canvas.sceneChange.emit(nextScene);
    fixture.detectChanges();

    expect(fixture.componentInstance.scene.xMin).toBe(-20);
    expect(fixture.componentInstance.scene.xMax).toBe(20);
  }));

  it('cleans up the 3D sampling timer on destroy', fakeAsync(() => {
    expression$.next('x+y');
    fixture.detectChanges();

    buttons()[1].click();
    fixture.detectChanges();
    fixture.destroy();
    tick(121);

    expect(sampler3D.sampleFunction).not.toHaveBeenCalled();
  }));

  function buttons(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('.graphic-quick-shell__button')
    ) as HTMLButtonElement[];
  }

  function toolbar(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.graphic-quick-shell__toolbar');
  }

  function get2D(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.graphic-plot-stub');
  }

  function get3D(): GraphCanvas3DStubComponent | null {
    return fixture.debugElement.query(
      By.directive(GraphCanvas3DStubComponent)
    )?.componentInstance as (GraphCanvas3DStubComponent | null) ?? null;
  }

  function readySample(): GraphSurfaceSample {
    return {
      functionId: 'graphic-quick-plot-3d',
      status: 'ready',
      totalSamples: 48 * 48,
      invalidSamples: 0,
      trace: {
        kind: 'surface',
        functionId: 'graphic-quick-plot-3d',
        label: 'x+y',
        expression: 'x+y',
        color: '#78a9ff',
        x: [0, 1],
        y: [0, 1],
        z: [
          [0, 1],
          [1, 2],
        ],
      },
    };
  }
});
