import { Component } from '@angular/core';
import { CalculatorBasicComponent } from '../../calculator-basic/calculator-basic';
import { DisplayComponent } from '../../display/display';
import { WorkSpace } from '../../work-space/work-space';
import { TopBar } from '../../top-bar/top-bar';
import { SidebarComponent } from '../../sidebar/sidebar';
import { CalculatorScientificComponent } from '../../calculator-scientific/calculator-scientific';
import { GraphicComponent } from '../../calculator-graphic/calculator-graphic';
import { CommonModule } from '@angular/common';
import { InspectorShellComponent } from '../../inspector-shell/inspector-shell';
import { ToggleService } from '../../../services/toggle-services/toggle';
@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule,
    GraphicComponent,
    CalculatorScientificComponent,
    TopBar,
    SidebarComponent,
    WorkSpace,
    DisplayComponent,
    CalculatorBasicComponent,
    InspectorShellComponent,
  ],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  readonly activeCalc$: ToggleService['activeCalc$'];

  constructor(toggleService: ToggleService) {
    this.activeCalc$ = toggleService.activeCalc$;
  }
}
