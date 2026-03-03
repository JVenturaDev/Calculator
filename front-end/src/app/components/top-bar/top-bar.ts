import { Component } from '@angular/core';
import { ToggleService } from '../../services/toggle-services/toggle';
import { Router } from '@angular/router';
import { WorkspaceApiService } from '../../services/workspaceApiService/workspace-api-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-top-bar',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './top-bar.html',
  styleUrls: ['./top-bar.css']
})
export class TopBar {

  constructor(private toggleService: ToggleService,
    public ws: WorkspaceApiService,
    private router: Router
  ) { }
  toggleSidebar() {
    this.toggleService.toggle('sidebar');
  }

  goLogin() { this.router.navigate(['/login']); }
  goRegister() { this.router.navigate(['/register']); }
}

