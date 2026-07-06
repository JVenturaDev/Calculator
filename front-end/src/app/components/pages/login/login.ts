import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceApiService } from '../../../services/workspace-api-service/workspace-api-service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { AuthSessionService } from '../../../services/auth/auth-session';
import { DemoEnvironmentService } from '../../../services/auth/demo-environment';

type LoginAction = 'login' | 'guest';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  imports: [FormsModule, CommonModule]

})
export class Login {

  username = '';
  password = '';
  error = '';
  loadingAction: LoginAction | null = null;

  constructor(
    private api: WorkspaceApiService,
    private router: Router,
    private authSession: AuthSessionService,
    private demoEnvironment: DemoEnvironmentService
  ) { }

  login() {
    if (this.loadingAction) return;

    this.error = '';
    this.loadingAction = 'login';

    this.api.login(this.username, this.password)
      .pipe(finalize(() => this.loadingAction = null))
      .subscribe({
        next: () => {
          this.authSession.clearDemoGuest();
          this.router.navigate(['/main']);
        },
        error: () => {
          this.error = 'Credenciales inválidas. Revisa tu usuario y contraseña.';
        }
      });
  }

  continueAsGuest() {
    if (this.loadingAction) return;

    this.error = '';
    this.loadingAction = 'guest';

    if (this.demoEnvironment.isDemoAllowed()) {
      this.authSession.startDemoGuest();
      this.loadingAction = null;
      this.router.navigate(['/main']);
      return;
    }

    this.api.guest()
      .pipe(finalize(() => this.loadingAction = null))
      .subscribe({
        next: () => {
          this.authSession.clearDemoGuest();
          this.router.navigate(['/main']);
        },
        error: () => {
          this.error = 'No fue posible iniciar la sesión de invitado.';
        }
      });
  }
  goRegister() { this.router.navigate(['/register']); }
}
