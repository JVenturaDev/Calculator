import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HumanStep } from '../../../services/calculation-renderers/human-render/human-renderer';
import Complex from 'complex.js';


@Component({
  selector: 'app-human-render-line',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './human-render-line.html',
  styleUrls: ['./human-render-line.css']
})
export class HumanRenderLineComponent {
  @Input() step!: HumanStep;


}
