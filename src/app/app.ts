import { Component } from '@angular/core';
import { CalculatorBasicComponent } from './components/calculator-basic/calculator-basic';
import { DisplayComponent } from './components/display/display';
import { HistoryComponent } from './components/history/history';
import { MemoryComponent } from './components/memory/memory';
import { WorkSpace } from './components/work-space/work-space';
import { TopBar } from './components/top-bar/top-bar';
import { SidebarComponent } from './components/sidebar/sidebar';
import { CalculatorScientificComponent } from './components/calculator-scientific/calculator-scientific';
import { GraphicComponent } from './components/calculator-graphic/calculator-graphic';
import { GraphicComponentPlot } from './components/graphic-plot/graphic-plot';
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [
    GraphicComponentPlot,
    GraphicComponent,
    CalculatorScientificComponent,
    TopBar,
    SidebarComponent,
    WorkSpace,
    MemoryComponent,
    DisplayComponent,
    CalculatorBasicComponent,
    HistoryComponent
  ]
})
export class AppComponent {
  inputValue: string = '';

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
