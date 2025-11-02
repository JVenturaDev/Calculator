import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DisplayStateService } from '../../services/display';
import { CalculatorEngineService } from '../../services/calculator-engine';
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

  expression: string = '';
  private sub!: Subscription;

  constructor(
    private display: DisplayStateService,
    private engine: CalculatorEngineService,
  ) { }

  ngOnInit(): void {
    this.renderExampleGraph();

    this.sub = this.display.value$.subscribe(val => {
      this.expression = val;
      this.updateGraph();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  updateGraph(): void {
    const expr = this.expression.trim();
    if (!expr) {
      this.renderExampleGraph();
      return;
    }

    try {
      if (expr.includes('y')) {
        this.render2DGraph(expr); 
      } else {
        this.render1DGraph(expr);
      }
    } catch (err) {
      console.error('Error al graficar la expresión:', err);
    }
  }

  render1DGraph(expression: string): void {
    const xValues = this.linspace(-10, 10, 400);
    const yValues = xValues.map(x => {
      try {
        return this.engine.evalExpressionWithVariables(expression, { x });
      } catch {
        return NaN;
      }
    });

    const trace = {
      x: xValues,
      y: yValues,
      mode: 'lines',
      type: 'scatter',
      line: { color: 'blue' },
    };

    const layout = {
      title: `Gráfica de y = ${expression}`,
      xaxis: { title: 'x' },
      yaxis: { title: 'y' },
      margin: { t: 30, r: 10, l: 40, b: 40 },
    };

    Plotly.newPlot(this.plotContainer.nativeElement, [trace], layout, { responsive: true });
  }


  render2DGraph(expression: string): void {
    const xRange = this.linspace(-10, 10, 100);
    const yRange = this.linspace(-10, 10, 100);

    const zValues: number[][] = [];

    for (let i = 0; i < yRange.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < xRange.length; j++) {
        const x = xRange[j];
        const y = yRange[i];
        try {
          const val = this.engine.evalExpressionWithVariables(expression, { x, y });

          row.push(Number(val));
        } catch {
          row.push(NaN);
        }
      }
      zValues.push(row);
    }

    const trace = {
      x: xRange,
      y: yRange,
      z: zValues,
      type: 'contour',
      colorscale: 'Viridis',
    };

    const layout = {
      title: `Gráfica de ${expression}`,
      xaxis: { title: 'x' },
      yaxis: { title: 'y' },
      margin: { t: 30, r: 10, l: 40, b: 40 },
    };

    Plotly.newPlot(this.plotContainer.nativeElement, [trace], layout, { responsive: true });
  }

  linspace(start: number, end: number, num: number): number[] {
    const arr = [];
    const step = (end - start) / (num - 1);
    for (let i = 0; i < num; i++) arr.push(start + step * i);
    return arr;
  }

  renderExampleGraph(): void {
    const xValues = this.linspace(-10, 10, 100);
    const yValues = xValues.map(x => Math.sin(x));

    Plotly.newPlot(this.plotContainer.nativeElement, [{
      x: xValues,
      y: yValues,
      mode: 'lines',
      type: 'scatter',
      line: { color: 'orange' }
    }], {
      title: 'Ejemplo: y = sin(x)',
      xaxis: { title: 'x' },
      yaxis: { title: 'y' }
    });
  }
}
