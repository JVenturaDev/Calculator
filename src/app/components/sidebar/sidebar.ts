import { Component, OnInit } from '@angular/core';
import { ToggleService, CalcType } from '../../services/toggle';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit {
  isVisible = false;

  constructor(
    private toggleService: ToggleService,
    private toggle: ToggleService) { }

  ngOnInit() {
    this.toggleService.getToggle('sidebar').subscribe(v => this.isVisible = v);
  }
  select(calc: CalcType) {
    this.toggle.setActiveCalc(calc);
  }
  }
