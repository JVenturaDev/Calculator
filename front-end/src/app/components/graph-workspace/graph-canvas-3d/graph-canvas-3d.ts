import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { GraphPlotly3DLoaderService, type GraphPlotly3DModule } from '../../../services/graph-workspace/graph-plotly-3d-loader';
import {
  cloneDefaultGraphScene3D,
  type GraphScene3D,
} from '../../../services/graph-workspace/graph-workspace-state';
import type { GraphSurfaceSample, GraphSurfaceTraceData } from '../../../services/graph-workspace/graph-sampling-3d';

type PlotlyTrace = Record<string, unknown>;
type PlotlyLayout = Record<string, unknown>;
type PlotlyConfig = Record<string, unknown>;
type PlotlyRelayoutEvent = Record<string, unknown>;
type PlotlyEventTarget = HTMLDivElement & {
  on?: PlotlyEventRegistrar;
  removeListener?: PlotlyEventRegistrar;
};
type PlotlyEventRegistrar = {
  (eventName: 'plotly_relayout', handler: (event: PlotlyRelayoutEvent) => void): void;
};

const DIMMED_TRACE_OPACITY = 0.42;
const SELECTED_TRACE_OPACITY = 1;
const VALUE_TOLERANCE = 1e-9;

@Component({
  selector: 'app-graph-canvas-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graph-canvas-3d.html',
  styleUrls: ['./graph-canvas-3d.css'],
})
export class GraphCanvas3DComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() samples: readonly GraphSurfaceSample[] = [];
  @Input({ required: true }) scene!: GraphScene3D;
  @Input() selectedFunctionId: string | null = null;
  @Input() ariaLabel = 'Graph Workspace 3D canvas';
  @Output() readonly sceneChange = new EventEmitter<GraphScene3D>();

  @ViewChild('plotContainer', { static: true })
  private plotContainer!: ElementRef<HTMLDivElement>;

  loading = true;
  errorMessage: string | null = null;

  private viewReady = false;
  private destroyed = false;
  private plotReady = false;
  private renderRevision = 0;
  private plotlyModule: GraphPlotly3DModule | null = null;
  private resizeObserver?: ResizeObserver;
  private relayoutListenerAttached = false;
  private currentScene: GraphScene3D = cloneDefaultGraphScene3D();

  private readonly plotConfig: PlotlyConfig = {
    responsive: true,
    displaylogo: false,
    scrollZoom: false,
  };

  constructor(private readonly loader: GraphPlotly3DLoaderService) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.currentScene = this.cloneScene(this.scene ?? cloneDefaultGraphScene3D());
    this.observeContainer();
    void this.renderPlot();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scene'] && this.scene) {
      this.currentScene = this.cloneScene(this.scene);
    }

    if (!this.viewReady) return;

    if (
      changes['samples'] ||
      changes['scene'] ||
      changes['selectedFunctionId'] ||
      changes['ariaLabel']
    ) {
      void this.renderPlot();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.detachRelayoutListener();
    this.resizeObserver?.disconnect();
    this.plotReady = false;

    if (this.plotlyModule) {
      this.plotlyModule.purge(this.plotContainer.nativeElement);
    }
  }

  private async renderPlot(): Promise<void> {
    if (this.destroyed || !this.viewReady) return;

    const revision = ++this.renderRevision;
    this.loading = !this.plotReady;
    this.errorMessage = null;

    try {
      const module = await this.loader.load();
      if (this.destroyed || revision !== this.renderRevision) return;

      this.plotlyModule = module;
      const element = this.plotContainer.nativeElement;
      const data = this.createTraces();
      const layout = this.createLayout();

      if (this.plotReady) {
        await module.react(element, data, layout, this.plotConfig);
      } else {
        await module.newPlot(element, data, layout, this.plotConfig);
        this.plotReady = true;
        this.attachRelayoutListener();
      }

      if (this.destroyed || revision !== this.renderRevision) return;
      this.loading = false;
    } catch {
      if (this.destroyed || revision !== this.renderRevision) return;

      this.loading = false;
      this.plotReady = false;
      this.errorMessage = 'No se pudo cargar la vista gráfica 3D.';
    }
  }

  private observeContainer(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => this.resizePlot());
    this.resizeObserver.observe(this.plotContainer.nativeElement);
  }

  private resizePlot(): void {
    if (this.destroyed || !this.plotReady || !this.plotlyModule) return;

    void this.plotlyModule.Plots.resize(this.plotContainer.nativeElement);
  }

  private attachRelayoutListener(): void {
    if (this.relayoutListenerAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    if (typeof element.on !== 'function') return;

    element.on('plotly_relayout', this.onRelayout);
    this.relayoutListenerAttached = true;
  }

  private detachRelayoutListener(): void {
    if (!this.relayoutListenerAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    element.removeListener?.('plotly_relayout', this.onRelayout);
    this.relayoutListenerAttached = false;
  }

  private readonly onRelayout = (event: PlotlyRelayoutEvent): void => {
    const nextScene = this.extractSceneChange(event);
    if (!nextScene) return;

    this.currentScene = nextScene;
    this.sceneChange.emit(nextScene);
  };

  private extractSceneChange(event: PlotlyRelayoutEvent): GraphScene3D | null {
    let nextScene = this.cloneScene(this.currentScene);
    let changed = false;

    if (
      this.hasInvalidRangePatch(event, 'scene.xaxis.range[0]', 'scene.xaxis.range[1]') ||
      this.hasInvalidRangePatch(event, 'scene.yaxis.range[0]', 'scene.yaxis.range[1]') ||
      this.hasInvalidRangePatch(event, 'scene.zaxis.range[0]', 'scene.zaxis.range[1]')
    ) {
      return null;
    }

    const camera = this.extractCameraPatch(event);
    if (camera) {
      nextScene = {
        ...nextScene,
        camera: camera.scene,
      };
      changed = true;
    }

    const xRange = this.extractRangePatch(event, 'scene.xaxis.range[0]', 'scene.xaxis.range[1]');
    if (xRange) {
      nextScene = {
        ...nextScene,
        xMin: xRange[0],
        xMax: xRange[1],
      };
      changed = true;
    }

    const yRange = this.extractRangePatch(event, 'scene.yaxis.range[0]', 'scene.yaxis.range[1]');
    if (yRange) {
      nextScene = {
        ...nextScene,
        yMin: yRange[0],
        yMax: yRange[1],
      };
      changed = true;
    }

    const zRange = this.extractRangePatch(event, 'scene.zaxis.range[0]', 'scene.zaxis.range[1]');
    if (zRange) {
      nextScene = {
        ...nextScene,
        zMin: zRange[0],
        zMax: zRange[1],
      };
      changed = true;
    }

    if (!changed) return null;
    if (this.isSameScene(this.currentScene, nextScene)) return null;

    return nextScene;
  }

  private extractCameraPatch(event: PlotlyRelayoutEvent): { scene: GraphScene3D['camera'] } | null {
    const eye = this.extractVectorPatch(event, 'scene.camera.eye');
    const up = this.extractVectorPatch(event, 'scene.camera.up');
    const center = this.extractVectorPatch(event, 'scene.camera.center');

    if (!eye && !up && !center) return null;

    const current = this.currentScene.camera;
    return {
      scene: {
        eye: eye ?? { ...current.eye },
        up: up ?? { ...current.up },
        center: center ?? { ...current.center },
      },
    };
  }

  private extractVectorPatch(
    event: PlotlyRelayoutEvent,
    prefix: string
  ): GraphScene3D['camera']['eye'] | null {
    const x = this.toFiniteNumber(event[`${prefix}.x`]);
    const y = this.toFiniteNumber(event[`${prefix}.y`]);
    const z = this.toFiniteNumber(event[`${prefix}.z`]);

    if (x === null && y === null && z === null) return null;

    const current = this.currentScene.camera;
    const currentVector =
      prefix === 'scene.camera.eye'
        ? current.eye
        : prefix === 'scene.camera.up'
          ? current.up
          : current.center;

    return {
      x: x ?? currentVector.x,
      y: y ?? currentVector.y,
      z: z ?? currentVector.z,
    };
  }

  private extractRangePatch(
    event: PlotlyRelayoutEvent,
    minKey: string,
    maxKey: string
  ): [number, number] | null {
    const min = this.toFiniteNumber(event[minKey]);
    const max = this.toFiniteNumber(event[maxKey]);

    if (min === null || max === null || min >= max) return null;
    return [min, max];
  }

  private hasInvalidRangePatch(
    event: PlotlyRelayoutEvent,
    minKey: string,
    maxKey: string
  ): boolean {
    const hasMin = Object.prototype.hasOwnProperty.call(event, minKey);
    const hasMax = Object.prototype.hasOwnProperty.call(event, maxKey);

    if (!hasMin && !hasMax) return false;
    if (!hasMin || !hasMax) return true;

    const min = this.toFiniteNumber(event[minKey]);
    const max = this.toFiniteNumber(event[maxKey]);
    return min === null || max === null || min >= max;
  }

  private toFiniteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private isSameScene(first: GraphScene3D, second: GraphScene3D): boolean {
    return (
      this.isSameNumber(first.xMin, second.xMin) &&
      this.isSameNumber(first.xMax, second.xMax) &&
      this.isSameNumber(first.yMin, second.yMin) &&
      this.isSameNumber(first.yMax, second.yMax) &&
      this.isSameNumber(first.zMin, second.zMin) &&
      this.isSameNumber(first.zMax, second.zMax) &&
      this.isSameVector(first.camera.eye, second.camera.eye) &&
      this.isSameVector(first.camera.up, second.camera.up) &&
      this.isSameVector(first.camera.center, second.camera.center)
    );
  }

  private isSameNumber(first: number, second: number): boolean {
    return Math.abs(first - second) <= VALUE_TOLERANCE;
  }

  private isSameVector(
    first: GraphScene3D['camera']['eye'],
    second: GraphScene3D['camera']['eye']
  ): boolean {
    return (
      this.isSameNumber(first.x, second.x) &&
      this.isSameNumber(first.y, second.y) &&
      this.isSameNumber(first.z, second.z)
    );
  }

  private createTraces(): PlotlyTrace[] {
    const readyTraces = this.samples
      .filter(sample => sample.status === 'ready' && sample.trace)
      .map(sample => this.toTrace(sample.trace as GraphSurfaceTraceData));

    if (this.selectedFunctionId === null) {
      return readyTraces;
    }

    const selectedIndex = readyTraces.findIndex(
      trace => trace['uid'] === this.selectedFunctionId
    );
    if (selectedIndex < 0) return readyTraces;

    const traces = readyTraces.map(trace =>
      trace['uid'] === this.selectedFunctionId
        ? { ...trace, opacity: SELECTED_TRACE_OPACITY }
        : { ...trace, opacity: DIMMED_TRACE_OPACITY }
    );

    return [
      ...traces.slice(0, selectedIndex),
      ...traces.slice(selectedIndex + 1),
      traces[selectedIndex],
    ];
  }

  private toTrace(trace: GraphSurfaceTraceData): PlotlyTrace {
    return {
      type: 'surface',
      x: [...trace.x],
      y: [...trace.y],
      z: trace.z.map(row => [...row]),
      name: trace.label,
      uid: trace.functionId,
      legendgroup: trace.functionId,
      showscale: false,
      colorscale: [
        [0, trace.color],
        [1, trace.color],
      ],
      opacity:
        this.selectedFunctionId === null
          ? undefined
          : trace.functionId === this.selectedFunctionId
            ? SELECTED_TRACE_OPACITY
            : DIMMED_TRACE_OPACITY,
    };
  }

  private createLayout(): PlotlyLayout {
    return {
      autosize: true,
      paper_bgcolor: '#0f1117',
      plot_bgcolor: '#0f1117',
      font: {
        color: '#c7cad4',
        family: '"JetBrains Mono", Consolas, monospace',
      },
      margin: { t: 18, r: 8, l: 8, b: 8 },
      showlegend: true,
      hovermode: false,
      scene: {
        xaxis: this.createAxis([this.currentScene.xMin, this.currentScene.xMax]),
        yaxis: this.createAxis([this.currentScene.yMin, this.currentScene.yMax]),
        zaxis: this.createAxis([this.currentScene.zMin, this.currentScene.zMax]),
        camera: this.cloneCamera(this.currentScene.camera),
        aspectmode: 'cube',
        bgcolor: '#0f1117',
      },
      legend: {
        orientation: 'h',
        x: 0,
        y: 1.08,
        font: { color: '#d8d9e3', size: 11 },
      },
    };
  }

  private createAxis(range: [number, number]): PlotlyLayout {
    return {
      range,
      color: '#aeb4c2',
      gridcolor: 'rgba(119, 128, 147, 0.22)',
      zerolinecolor: 'rgba(173, 198, 255, 0.42)',
      backgroundcolor: '#0f1117',
      linecolor: 'rgba(119, 128, 147, 0.34)',
      tickfont: { color: '#9399a8', size: 10 },
      title: { font: { color: '#aeb4c2', size: 11 } },
    };
  }

  private cloneScene(scene: GraphScene3D): GraphScene3D {
    return {
      xMin: scene.xMin,
      xMax: scene.xMax,
      yMin: scene.yMin,
      yMax: scene.yMax,
      zMin: scene.zMin,
      zMax: scene.zMax,
      camera: this.cloneCamera(scene.camera),
    };
  }

  private cloneCamera(camera: GraphScene3D['camera']): GraphScene3D['camera'] {
    return {
      eye: { ...camera.eye },
      up: { ...camera.up },
      center: { ...camera.center },
    };
  }
}
