import { Component } from '@angular/core';
import { ToggleService } from '../../services/toggle-services/toggle';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../services/auth/auth-session';

@Component({
  selector: 'app-top-bar',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './top-bar.html',
  styleUrls: ['./top-bar.css']
})
export class TopBar {
  readonly sidebarVisible$: Observable<boolean>;

  constructor(
    private toggleService: ToggleService,
    private router: Router,
    private authSession: AuthSessionService
  ) {
    this.sidebarVisible$ = this.toggleService.getToggle('sidebar').asObservable();
  }

  toggleSidebar() {
    this.toggleService.toggle('sidebar');
  }

  isAuthenticated(): boolean {
    return this.authSession.canAccessMain();
  }

  logout(): void {
    this.authSession.clearSession();
    this.router.navigate(['/login']);
  }

  goLogin() { this.router.navigate(['/login']); }
  goRegister() { this.router.navigate(['/register']); }
}

