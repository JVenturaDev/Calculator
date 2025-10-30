// src/app/components/graphic/graphic.component.ts
import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DisplayStateService } from '../../services/display';
import { CalculatorEngineService } from '../../services/calculator-engine';
import Complex from 'complex.js';

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
    private engine: CalculatorEngineService
  ) {}

  ngOnInit(): void {
    // Suscribirse al input
    this.sub = this.display.value$.subscribe(val => {
      this.expression = val;
      this.updateGraph();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // 🔹 Evalúa la expresión y actualiza la gráfica
  updateGraph(): void {
    try {
      if (!this.expression) return;

      const replaced = this.engine.replaceFunction(this.expression);
      const result = this.engine.evalExpresion(replaced);

      // Aquí va la lógica para convertir `result` a datos de la gráfica
      // Ejemplo placeholder:
      this.renderGraph(result);
    } catch (err) {
      console.error('Error al evaluar la expresión para la gráfica:', err);
    }
  }

  // 🔹 Renderiza los datos usando tu librería de gráficos
  renderGraph(result: string | number | Complex): void {
    // Placeholder: implementa Plotly, Chart.js, etc.
    // Ejemplo básico:
    const container = this.plotContainer.nativeElement;
    container.innerHTML = `<p>Resultado: ${result}</p>`;
  }
}
