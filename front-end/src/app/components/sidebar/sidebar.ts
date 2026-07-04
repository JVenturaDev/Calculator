import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToggleService, CalcType } from '../../services/toggle-services/toggle';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  isVisible = false;
  activeCalc: CalcType = 'graphic';
  private readonly subscriptions = new Subscription();

  constructor(private toggleService: ToggleService) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.toggleService.getToggle('sidebar').subscribe(v => this.isVisible = v)
    );
    this.subscriptions.add(
      this.toggleService.activeCalc$.subscribe(calc => this.activeCalc = calc)
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  select(calc: CalcType): void {
    this.toggleService.setActiveCalc(calc);
  }
}
