import { Component } from '@angular/core';
import { ToggleService } from '../../services/toggle-services/toggle';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  templateUrl: './top-bar.html',
  styleUrls: ['./top-bar.css']
})
export class TopBar {
  constructor(private toggleService: ToggleService) {}
  toggleSidebar() {
    this.toggleService.toggle('sidebar');
  }
}
