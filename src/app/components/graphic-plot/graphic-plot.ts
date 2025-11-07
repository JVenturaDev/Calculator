import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CalculatorEngineService } from '../../services/calculator-engine';
import { GraphicPlotService } from '../../services/graphic-plot';
import Plotly from 'plotly.js-dist-min';

@Component({
  selector: 'app-graphic-plot',
  templateUrl: './graphic-plot.html',
  styleUrls: ['./graphic-plot.css'],
  standalone: true,
  imports: [CommonModule]
})
export class GraphicComponentPlot implements OnInit, OnDestroy {
  @ViewChild('plotContainer', { static: true }) plotContainer!: ElementRef<HTMLDivElement>;
  private sub!: Subscription;

  constructor(
    private engine: CalculatorEngineService,
    private graphicService: GraphicPlotService
  ) { }

  ngOnInit(): void {
    this.sub = this.graphicService.expression$.subscribe(expr => {
      if (expr) this.plotExpression(expr);
      else this.renderExampleGraph();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  plotExpression(expression: string): void {
    const expr = expression.trim();
    if (!expr) return;

    try {
      if (expr.includes('y')) this.plot2D(expr);
      else this.plot1D(expr);
    } catch (err) {
      console.error('Error al graficar la expresión:', err);
    }
  }

  private plot1D(expression: string): void {
    const xValues = this.linspace(-10, 10, 400);
    const yValues = xValues.map(x => {
      try { return Number(this.engine.evalExpressionWithVariables(expression, { x })); }
      catch { return NaN; }
    });

    Plotly.newPlot(this.plotContainer.nativeElement, [{
      x: xValues, y: yValues,
      mode: 'lines', type: 'scatter', line: { color: 'blue' }
    }],
      {
        title: `y = ${expression}`, xaxis: { title: 'x' },
        yaxis: { title: 'y' }, margin: { t: 30, r: 10, l: 40, b: 40 }
      });
  }

  private plot2D(expression: string): void {
    const xRange = this.linspace(-10, 10, 100);
    const yRange = this.linspace(-10, 10, 100);

    const zValues: number[][] = yRange.map(y => xRange.map(x => {
      try { return Number(this.engine.evalExpressionWithVariables(expression, { x, y })); }
      catch { return NaN; }
    }));

    Plotly.newPlot(this.plotContainer.nativeElement, [{
      x: xRange, y: yRange,
      z: zValues, type: 'contour', colorscale: 'Viridis'
    }],
      { title: `${expression}`, xaxis: { title: 'x' }, yaxis: { title: 'y' }, margin: { t: 30, r: 10, l: 40, b: 40 } });
  }

  private linspace(start: number, end: number, num: number): number[] {
    const arr = [];
    const step = (end - start) / (num - 1);
    for (let i = 0; i < num; i++) arr.push(start + step * i);
    return arr;
  }

  private renderExampleGraph(): void {
    const xValues = this.linspace(-10, 10, 100);
    const yValues = xValues.map(x => Math.sin(x));
    Plotly.newPlot(this.plotContainer.nativeElement, [{
      x: xValues, y: yValues,
      mode: 'lines', type: 'scatter', line: { color: 'orange' }
    }],
      { title: 'Ejemplo: y = sin(x)', xaxis: { title: 'x' }, yaxis: { title: 'y' } });
  }
}
