import { Component, Inject, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GraphicPlotService } from '../../services/plot-services/graphic-plot';
import Plotly from 'plotly.js-dist-min';
import {
  CALCULATION_ENGINE,
  CalculationEngine,
} from '../../services/engine-services/calculation-engine.contract';

@Component({
  selector: 'app-graphic-plot',
  templateUrl: './graphic-plot.html',
  styleUrls: ['./graphic-plot.css'],
  standalone: true,
  imports: [CommonModule]
})
export class GraphicComponentPlot implements OnInit, OnDestroy {
  @ViewChild('plotContainer', { static: true }) plotContainer!: ElementRef<HTMLDivElement>;
  plotDescription = 'Ejemplo: y = sin(x)';

  private sub?: Subscription;
  private resizeObserver?: ResizeObserver;
  private plotReady = false;
  private destroyed = false;
  private readonly plotConfig = {
    responsive: true,
    displaylogo: false,
  };

  constructor(
    @Inject(CALCULATION_ENGINE) private engine: CalculationEngine,
    private graphicService: GraphicPlotService
  ) { }

  ngOnInit(): void {
    this.observeContainer();
    this.sub = this.graphicService.expression$.subscribe(expr => {
      if (expr) this.plotExpression(expr);
      else this.renderExampleGraph();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.sub?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.plotReady = false;
    Plotly.purge(this.plotContainer.nativeElement);
  }

  plotExpression(expression: string): void {
    const expr = expression.trim();
    if (!expr) return;

    try {
      this.plotDescription = `Gráfica de ${expr}`;
      if (expr.includes('y')) this.plot2D(expr);
      else this.plot1D(expr);
    } catch (err) {
      console.error('Error al graficar la expresión:', err);
    }
  }

  private plot1D(expression: string): void {
    const xValues = this.linspace(-10, 10, 400);
    const yValues = xValues.map(x => {
      try { return Number(this.engine.evaluate(expression, { variables: { x } })); }
      catch { return NaN; }
    });

    this.renderPlot([{
      x: xValues, y: yValues,
      mode: 'lines', type: 'scatter', line: { color: '#78a9ff', width: 2.5 }
    }], `y = ${expression}`);
  }

  private plot2D(expression: string): void {
    const xRange = this.linspace(-10, 10, 100);
    const yRange = this.linspace(-10, 10, 100);

    const zValues: number[][] = yRange.map(y => xRange.map(x => {
      try { return Number(this.engine.evaluate(expression, { variables: { x, y } })); }
      catch { return NaN; }
    }));

    this.renderPlot([{
      x: xRange, y: yRange,
      z: zValues, type: 'contour', colorscale: 'Viridis'
    }], expression);
  }

  private linspace(start: number, end: number, num: number): number[] {
    const arr = [];
    const step = (end - start) / (num - 1);
    for (let i = 0; i < num; i++) arr.push(start + step * i);
    return arr;
  }

  private renderExampleGraph(): void {
    this.plotDescription = 'Ejemplo: y = sin(x)';
    const xValues = this.linspace(-10, 10, 100);
    const yValues = xValues.map(x => Math.sin(x));
    this.renderPlot([{
      x: xValues, y: yValues,
      mode: 'lines', type: 'scatter', line: { color: '#c2a7ff', width: 2.5 }
    }], 'Ejemplo: y = sin(x)');
  }

  private renderPlot(data: Record<string, unknown>[], title: string): void {
    this.plotReady = true;
    void Plotly.newPlot(
      this.plotContainer.nativeElement,
      data,
      this.createLayout(title),
      this.plotConfig
    );
  }

  private createLayout(title: string) {
    const axis = (label: string) => ({
      title: { text: label, font: { color: '#aeb4c2', size: 11 } },
      color: '#aeb4c2',
      gridcolor: 'rgba(119, 128, 147, 0.2)',
      zerolinecolor: 'rgba(173, 198, 255, 0.42)',
      linecolor: 'rgba(119, 128, 147, 0.32)',
      tickfont: { color: '#9399a8', size: 10 },
      automargin: true,
    });

    return {
      autosize: true,
      title: {
        text: title,
        x: 0.04,
        xanchor: 'left',
        font: { color: '#e3e1ec', size: 13 },
      },
      paper_bgcolor: '#0f1117',
      plot_bgcolor: '#0f1117',
      font: {
        color: '#c7cad4',
        family: '"JetBrains Mono", Consolas, monospace',
      },
      xaxis: axis('x'),
      yaxis: axis('y'),
      margin: { t: 42, r: 18, l: 48, b: 44 },
      showlegend: false,
      hoverlabel: {
        bgcolor: '#292c35',
        bordercolor: '#596173',
        font: { color: '#f0edf6' },
      },
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
