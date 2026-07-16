import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription, distinctUntilChanged } from 'rxjs';

import { GraphicComponentPlot } from '../graphic-plot/graphic-plot';
import { GraphCanvas3DComponent } from '../graph-workspace/graph-canvas-3d/graph-canvas-3d';
import {
  cloneDefaultGraphScene3D,
  type GraphFunction,
  type GraphScene3D,
} from '../../services/graph-workspace/graph-workspace-state';
import {
  GraphFunctionSampler3DService,
} from '../../services/graph-workspace/graph-function-sampler-3d';
import {
  type GraphSurfaceSample,
} from '../../services/graph-workspace/graph-sampling-3d';
import { GraphicPlotService } from '../../services/plot-services/graphic-plot';
import {
  GraphVariableDetectorService,
  type GraphVariables,
} from '../../services/polish-services/graph-variable-detector';

const GRAPHIC_QUICK_PLOT_FUNCTION_ID = 'graphic-quick-plot-3d';
const GRAPHIC_QUICK_PLOT_COLOR = '#78a9ff';
const GRAPHIC_3D_SAMPLE_DEBOUNCE_MS = 120;

@Component({
  selector: 'app-graphic-quick-plot-shell',
  standalone: true,
  imports: [CommonModule, GraphicComponentPlot, GraphCanvas3DComponent],
  templateUrl: './graphic-quick-plot-shell.html',
  styleUrls: ['./graphic-quick-plot-shell.css'],
})
export class GraphicQuickPlotShellComponent implements OnInit, OnDestroy {
  viewMode: '2d' | '3d' = '2d';
  expression = '';
  compatibility: GraphVariables = { hasX: false, hasY: false };
  compatibilityMessage: string | null = null;
  loading3D = false;
  sampleError: string | null = null;
  scene: GraphScene3D = cloneDefaultGraphScene3D();
  surfaceSamples: readonly GraphSurfaceSample[] = [];
  selectedFunctionId: string | null = null;

  private readonly subscriptions = new Subscription();
  private sampleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly graphicPlotService: GraphicPlotService,
    private readonly detector: GraphVariableDetectorService,
    private readonly sampler3D: GraphFunctionSampler3DService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.graphicPlotService.expression$
        .pipe(distinctUntilChanged())
        .subscribe(expression => {
          this.expression = expression ?? '';
          this.updateCompatibility();
          this.refresh3DState();
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearSampleTimer();
  }

  selectViewMode(mode: '2d' | '3d'): void {
    if (mode === this.viewMode) return;

    this.viewMode = mode;
    if (mode === '2d') {
      this.clearSampleTimer();
      this.loading3D = false;
      this.sampleError = null;
      return;
    }

    this.refresh3DState();
  }

  onSceneChange(scene: GraphScene3D): void {
    this.scene = scene;
    if (this.viewMode === '3d') {
      this.refresh3DState();
    }
  }

  get canUse3D(): boolean {
    return Boolean(this.expression.trim()) && this.compatibility.hasX && this.compatibility.hasY;
  }

  get statusText(): string {
    if (this.viewMode === '3d') {
      if (!this.canUse3D) {
        return 'La vista 3D requiere una expresión que use x e y.';
      }
      if (this.loading3D) {
        return 'Cargando vista 3D…';
      }

      if (this.sampleError) {
        return this.sampleError;
      }

      return 'Vista 3D lista';
    }

    return 'Vista 2D activa';
  }

  private updateCompatibility(): void {
    this.compatibility = this.detector.detect(this.expression);
    this.compatibilityMessage = this.canUse3D
      ? null
      : 'La vista 3D requiere una expresión que use x e y.';
  }

  private refresh3DState(): void {
    if (this.viewMode !== '3d') {
      return;
    }

    if (!this.canUse3D) {
      this.clearSampleTimer();
      this.loading3D = false;
      this.sampleError = null;
      this.surfaceSamples = [];
      this.selectedFunctionId = null;
      return;
    }

    this.loading3D = true;
    this.sampleError = null;
    this.selectedFunctionId = GRAPHIC_QUICK_PLOT_FUNCTION_ID;
    this.schedule3DSample();
  }

  private schedule3DSample(): void {
    this.clearSampleTimer();
    this.sampleTimer = setTimeout(() => {
      if (this.viewMode !== '3d' || !this.canUse3D) {
        return;
      }

      try {
        const graphFunction = this.createGraphFunction(this.expression);
        const sample = this.sampler3D.sampleFunction(graphFunction, this.scene);
        this.surfaceSamples = [sample];
        this.sampleError = sample.status === 'invalid'
          ? 'No se pudo generar la vista 3D.'
          : null;
      } catch {
        this.surfaceSamples = [];
        this.sampleError = 'No se pudo generar la vista 3D.';
      } finally {
        this.loading3D = false;
      }
    }, GRAPHIC_3D_SAMPLE_DEBOUNCE_MS);
  }

  private clearSampleTimer(): void {
    if (this.sampleTimer === null) {
      return;
    }

    clearTimeout(this.sampleTimer);
    this.sampleTimer = null;
  }

  private createGraphFunction(expression: string): GraphFunction {
    const timestamp = new Date();
    const label = expression.trim() || 'Gráfica 3D';

    return {
      id: GRAPHIC_QUICK_PLOT_FUNCTION_ID,
      expression,
      label,
      color: GRAPHIC_QUICK_PLOT_COLOR,
      visible: true,
      plotKind: 'contour',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
}
