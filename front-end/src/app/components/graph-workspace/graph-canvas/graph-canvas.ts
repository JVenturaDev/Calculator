import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
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

  @ViewChild('plotContainer', { static: true })
  private plotContainer!: ElementRef<HTMLDivElement>;

  private resizeObserver?: ResizeObserver;
  private plotReady = false;
  private viewReady = false;
  private destroyed = false;
  private renderRevision = 0;

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
