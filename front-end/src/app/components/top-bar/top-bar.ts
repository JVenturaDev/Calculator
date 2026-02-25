import { Component } from '@angular/core';
import { ToggleService } from '../../services/toggle-services/toggle';
import { Router } from '@angular/router';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  templateUrl: './top-bar.html',
  styleUrls: ['./top-bar.css']
})
export class TopBar {

  constructor(private toggleService: ToggleService,
    private router: Router
  ) { }
  toggleSidebar() {
    this.toggleService.toggle('sidebar');
  }
  goLogin() { this.router.navigate(['/login']); }
  goRegister() { this.router.navigate(['/register']); }
}

