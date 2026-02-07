import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookStep } from '../../../../services/book-renderer-service/book-renderer';
import { CalculationParserService } from '../../../../services/calculation/calculation-parser';
import Complex from 'complex.js';

@Component({
  selector: 'app-book-render-line',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-render-line.html',
  styleUrls: ['./book-render-line.css']
})
export class BookRenderLineComponent {
  @Input() step!: BookStep;

  constructor(private parser: CalculationParserService) {}

  formatValue(value: number | Complex): string {
    return this.parser.formatValue(value);
  }
}
