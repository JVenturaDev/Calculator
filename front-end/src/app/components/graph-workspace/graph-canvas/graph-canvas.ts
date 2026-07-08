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
import Plotly from 'plotly.js-cartesian-dist-min';

import { GraphFunctionSample } from '../../../services/graph-workspace/graph-sampling';
import { GraphViewport2D } from '../../../services/graph-workspace/graph-workspace-state';

type PlotlyTrace = Record<string, unknown>;
type PlotlyLayout = Record<string, unknown>;
type PlotlyConfig = Record<string, unknown>;
type PlotlyRelayoutEvent = Record<string, unknown>;
type PlotlyClickPoint = {
  readonly data?: { readonly uid?: unknown };
  readonly fullData?: { readonly uid?: unknown };
};
type PlotlyClickEvent = {
  readonly points?: readonly PlotlyClickPoint[];
};
type PlotlyEventTarget = HTMLDivElement & {
  on?: PlotlyEventRegistrar;
  removeListener?: PlotlyEventRegistrar;
};
type PlotlyEventRegistrar = {
  (eventName: 'plotly_relayout', handler: (event: PlotlyRelayoutEvent) => void): void;
  (eventName: 'plotly_click', handler: (event: PlotlyClickEvent) => void): void;
};

@Component({
  selector: 'app-graph-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graph-canvas.html',
  styleUrls: ['./graph-canvas.css'],
})
export class GraphCanvasComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() samples: readonly GraphFunctionSample[] = [];
  @Input({ required: true }) viewport!: GraphViewport2D;
  @Input() ariaLabel = 'Graph Workspace canvas';
  @Output() readonly viewportChange = new EventEmitter<GraphViewport2D>();
  @Output() readonly functionSelect = new EventEmitter<string>();

  @ViewChild('plotContainer', { static: true })
  private plotContainer!: ElementRef<HTMLDivElement>;

  private resizeObserver?: ResizeObserver;
  private plotReady = false;
  private viewReady = false;
  private destroyed = false;
  private renderRevision = 0;
  private relayoutListenerAttached = false;
  private clickListenerAttached = false;

  private readonly relayoutHandler = (event: PlotlyRelayoutEvent): void => {
    const viewport = this.extractViewport(event);
    if (viewport) this.viewportChange.emit(viewport);
  };

  private readonly clickHandler = (event: PlotlyClickEvent): void => {
    const functionId = this.extractFunctionId(event);
    if (functionId) this.functionSelect.emit(functionId);
  };

  private readonly plotConfig: PlotlyConfig = {
    responsive: true,
    displaylogo: false,
    scrollZoom: false,
  };

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.observeContainer();
    void this.renderPlot();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) return;
    if (changes['samples'] || changes['viewport'] || changes['ariaLabel']) {
      void this.renderPlot();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.detachRelayoutListener();
    this.detachClickListener();
    this.resizeObserver?.disconnect();
    this.plotReady = false;
    Plotly.purge(this.plotContainer.nativeElement);
  }

  private async renderPlot(): Promise<void> {
    if (this.destroyed || !this.viewport) return;

    const revision = ++this.renderRevision;
    const element = this.plotContainer.nativeElement;
    const traces = this.createTraces();
    const layout = this.createLayout();

    if (this.plotReady) {
      await Plotly.react(element, traces, layout, this.plotConfig);
    } else {
      this.plotReady = true;
      await Plotly.newPlot(element, traces, layout, this.plotConfig);
    }

    if (this.destroyed || revision !== this.renderRevision) return;
    this.attachRelayoutListener();
    this.attachClickListener();
  }

  private attachRelayoutListener(): void {
    if (this.relayoutListenerAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    if (typeof element.on !== 'function') return;

    element.on('plotly_relayout', this.relayoutHandler);
    this.relayoutListenerAttached = true;
  }

  private detachRelayoutListener(): void {
    if (!this.relayoutListenerAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    element.removeListener?.('plotly_relayout', this.relayoutHandler);
    this.relayoutListenerAttached = false;
  }

  private attachClickListener(): void {
    if (this.clickListenerAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    if (typeof element.on !== 'function') return;

    element.on('plotly_click', this.clickHandler);
    this.clickListenerAttached = true;
  }

  private detachClickListener(): void {
    if (!this.clickListenerAttached) return;

    const element = this.plotContainer.nativeElement as PlotlyEventTarget;
    element.removeListener?.('plotly_click', this.clickHandler);
    this.clickListenerAttached = false;
  }

  private extractViewport(
    event: PlotlyRelayoutEvent
  ): GraphViewport2D | null {
    const xMin = this.toFiniteNumber(event['xaxis.range[0]']);
    const xMax = this.toFiniteNumber(event['xaxis.range[1]']);
    const yMin = this.toFiniteNumber(event['yaxis.range[0]']);
    const yMax = this.toFiniteNumber(event['yaxis.range[1]']);

    if (xMin === null || xMax === null || yMin === null || yMax === null) {
      return null;
    }

    if (xMin >= xMax || yMin >= yMax) return null;

    return { xMin, xMax, yMin, yMax };
  }

  private toFiniteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private extractFunctionId(event: PlotlyClickEvent): string | null {
    const point = event.points?.[0];
    const uid = point?.data?.uid ?? point?.fullData?.uid;
    if (typeof uid !== 'string') return null;

    const functionId = uid.trim();
    return functionId.length > 0 ? functionId : null;
  }

  private createTraces(): PlotlyTrace[] {
    return this.samples.reduce<PlotlyTrace[]>((traces, sample) => {
      if (sample.status !== 'ready' || !sample.trace) return traces;

        const trace = sample.trace;

        if (trace.kind === 'line') {
          traces.push({
            type: 'scatter',
            mode: 'lines',
            x: [...trace.x],
            y: [...trace.y],
            name: trace.label,
            uid: trace.functionId,
            legendgroup: trace.functionId,
            line: {
              color: trace.color,
              width: 2.5,
            },
            connectgaps: false,
          });
          return traces;
        }

        traces.push({
          type: 'contour',
          x: [...trace.x],
          y: [...trace.y],
          z: trace.z.map(row => [...row]),
          name: trace.label,
          uid: trace.functionId,
          legendgroup: trace.functionId,
          colorscale: [
            [0, trace.color],
            [1, trace.color],
          ],
          contours: {
            coloring: 'lines',
          },
          showscale: false,
        });
        return traces;
      }, []);
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
      xaxis: this.createAxis('x', [this.viewport.xMin, this.viewport.xMax]),
      yaxis: this.createAxis('y', [this.viewport.yMin, this.viewport.yMax]),
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
    };
  }

  private createAxis(label: string, range: [number, number]): PlotlyLayout {
    return {
      title: { text: label, font: { color: '#aeb4c2', size: 11 } },
      range,
      color: '#aeb4c2',
      gridcolor: 'rgba(119, 128, 147, 0.22)',
      zerolinecolor: 'rgba(173, 198, 255, 0.42)',
      linecolor: 'rgba(119, 128, 147, 0.34)',
      tickfont: { color: '#9399a8', size: 10 },
      automargin: true,
    };
  }

  private observeContainer(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => this.resizePlot());
    this.resizeObserver.observe(this.plotContainer.nativeElement);
  }

  private resizePlot(): void {
    if (this.destroyed || !this.plotReady) return;
    void Plotly.Plots.resize(this.plotContainer.nativeElement);
  }
}
