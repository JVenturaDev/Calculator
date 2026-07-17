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
import type { GraphSurfaceSample } from '../../../services/graph-workspace/graph-sampling-3d';
import { type GraphCanvasHover } from '../graph-canvas/graph-canvas';

type PlotlyTrace = Record<string, unknown>;
type PlotlyLayout = Record<string, unknown>;
type PlotlyConfig = Record<string, unknown>;
type PlotlyRelayoutEvent = Record<string, unknown>;
type PlotlyPoint = {
  readonly data?: { readonly uid?: unknown };
  readonly fullData?: { readonly uid?: unknown };
  readonly x?: unknown;
  readonly y?: unknown;
  readonly z?: unknown;
  readonly pointIndex?: unknown;
  readonly pointNumber?: unknown;
};
type PlotlyClickEvent = {
  readonly points?: readonly PlotlyPoint[];
};
type PlotlyEventTarget = HTMLDivElement & {
  on?: PlotlyEventRegistrar;
  removeListener?: PlotlyEventRegistrar;
};
type PlotlyEventRegistrar = {
  (eventName: 'plotly_relayout', handler: (event: PlotlyRelayoutEvent) => void): void;
  (eventName: 'plotly_click', handler: (event: PlotlyClickEvent) => void): void;
  (eventName: 'plotly_hover', handler: (event: PlotlyClickEvent) => void): void;
  (eventName: 'plotly_unhover', handler: () => void): void;
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
  @Output() readonly functionSelect = new EventEmitter<string>();
  @Output() readonly hoverChange = new EventEmitter<GraphCanvasHover | null>();

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
  private clickListenerAttached = false;
  private hoverListenersAttached = false;
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
    this.detachClickListener();
    this.detachHoverListeners();
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
        this.attachClickListener();
        this.attachHoverListeners();
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

  private attachClickListener(): void {
    if (this.clickListenerAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    if (typeof element.on !== 'function') return;

    element.on('plotly_click', this.onClick);
    this.clickListenerAttached = true;
  }

  private detachClickListener(): void {
    if (!this.clickListenerAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    element.removeListener?.('plotly_click', this.onClick);
    this.clickListenerAttached = false;
  }

  private attachHoverListeners(): void {
    if (this.hoverListenersAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    if (typeof element.on !== 'function') return;

    element.on('plotly_hover', this.onHover);
    element.on('plotly_unhover', this.onUnhover);
    this.hoverListenersAttached = true;
  }

  private detachHoverListeners(): void {
    if (!this.hoverListenersAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    element.removeListener?.('plotly_hover', this.onHover);
    element.removeListener?.('plotly_unhover', this.onUnhover);
    this.hoverListenersAttached = false;
  }

  private readonly onRelayout = (event: PlotlyRelayoutEvent): void => {
    const nextScene = this.extractSceneChange(event);
    if (!nextScene) return;

    this.currentScene = nextScene;
    this.sceneChange.emit(nextScene);
  };

  private readonly onClick = (event: PlotlyClickEvent): void => {
    const functionId = this.extractFunctionId(event);
    if (!functionId) return;

    this.functionSelect.emit(functionId);
  };

  private readonly onHover = (event: PlotlyClickEvent): void => {
    const hover = this.extractHover(event);
    if (!hover) return;

    this.hoverChange.emit(hover);
  };

  private readonly onUnhover = (): void => {
    this.hoverChange.emit(null);
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

  private toPointIndex(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0
      ? value
      : null;
  }

  private extractFunctionId(event: PlotlyClickEvent): string | null {
    const point = event.points?.[0];
    const uid = point?.data?.uid ?? point?.fullData?.uid;

    if (typeof uid !== 'string') return null;

    const functionId = uid.trim();
    return functionId.length > 0 ? functionId : null;
  }

  private extractHover(event: PlotlyClickEvent): GraphCanvasHover | null {
    const point = event.points?.[0];
    const functionId = this.extractFunctionId(event);
    if (!point || !functionId) return null;

    const x = this.toFiniteNumber(point.x);
    const y = this.toFiniteNumber(point.y);
    const z = this.toFiniteNumber(point.z);
    if (x === null || y === null || z === null) return null;

    const pointIndex = this.toPointIndex(point.pointIndex ?? point.pointNumber);

    return {
      functionId,
      x,
      y,
      z,
      ...(pointIndex !== null ? { pointIndex } : {}),
    };
  }

  private createTraces(): PlotlyTrace[] {
    const traces = this.samples.reduce<PlotlyTrace[]>((list, sample) => {
      if (sample.status !== 'ready' || !sample.trace) return list;

      const trace = sample.trace;
      const isSelected = trace.functionId === this.selectedFunctionId;
      const hasSelection = this.selectedFunctionId !== null;
      const opacity = isSelected ? SELECTED_TRACE_OPACITY : DIMMED_TRACE_OPACITY;

      list.push({
        type: 'surface',
        x: [...trace.x],
        y: [...trace.y],
        z: trace.z.map(row => [...row]),
        name: trace.label,
        uid: trace.functionId,
        legendgroup: trace.functionId,
        ...(hasSelection ? { opacity } : {}),
        colorscale: [
          [0, trace.color],
          [1, trace.color],
        ],
        showscale: false,
      });
      return list;
    }, []);

    return this.selectedFunctionId === null
      ? traces
      : this.moveSelectedTraceToEnd(traces);
  }

  private moveSelectedTraceToEnd(traces: PlotlyTrace[]): PlotlyTrace[] {
    const selectedIndex = traces.findIndex(
      trace => trace['uid'] === this.selectedFunctionId
    );
    if (selectedIndex < 0) return traces;

    return [
      ...traces.slice(0, selectedIndex),
      ...traces.slice(selectedIndex + 1),
      traces[selectedIndex],
    ];
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
      margin: { t: 24, r: 18, l: 48, b: 44 },
      showlegend: true,
      hovermode: 'closest',
      legend: {
        orientation: 'h',
        x: 0,
        y: 1.12,
        font: { color: '#d8d9e3', size: 11 },
      },
      hoverlabel: {
        bgcolor: '#292c35',
        bordercolor: '#596173',
        font: { color: '#f0edf6' },
      },
      scene: {
        xaxis: this.createAxis('x', [this.currentScene.xMin, this.currentScene.xMax]),
        yaxis: this.createAxis('y', [this.currentScene.yMin, this.currentScene.yMax]),
        zaxis: this.createAxis('z', [this.currentScene.zMin, this.currentScene.zMax]),
        camera: this.cloneCamera(this.currentScene.camera),
        aspectmode: 'cube',
        bgcolor: '#0f1117',
      },
    };
  }

  private createAxis(label: string, range: [number, number]): PlotlyLayout {
    return {
      title: { text: label, font: { color: '#aeb4c2', size: 11 } },
      range,
      color: '#aeb4c2',
      gridcolor: 'rgba(119, 128, 147, 0.22)',
      zerolinecolor: 'rgba(173, 198, 255, 0.42)',
      backgroundcolor: '#0f1117',
      linecolor: 'rgba(119, 128, 147, 0.34)',
      tickfont: { color: '#9399a8', size: 10 },
      automargin: true,
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
