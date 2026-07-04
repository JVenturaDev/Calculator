import { Component, OnInit } from '@angular/core';
import { CalculatorBasicComponent } from '../../calculator-basic/calculator-basic';
import { DisplayComponent } from '../../display/display';
import { WorkSpace } from '../../work-space/work-space';
import { TopBar } from '../../top-bar/top-bar';
import { SidebarComponent } from '../../sidebar/sidebar';
import { CalculatorScientificComponent } from '../../calculator-scientific/calculator-scientific';
import { GraphicComponent } from '../../calculator-graphic/calculator-graphic';
import { parser } from '../../../services/polish-services/polish-notation-parser-service';
import { WorkspaceApiService } from '../../../services/workspaceApiService/workspace-api-service';
import { Login } from '../login/login';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { InspectorShellComponent } from '../../inspector-shell/inspector-shell';
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
export class Main implements OnInit {
  inputValue: string = '';

  constructor(private parserPolish: parser,
    private api: WorkspaceApiService
  ) { }

  ngOnInit(): void {
    this.parserPolish.testPostfix("sin(asinh(9))");
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      this.inputValue = this.inputValue.slice(0, -1);
      event.preventDefault();
    } else if (event.key === 'Enter') {
      console.log("Enter presionado");
      event.preventDefault();
    }
  }
}
