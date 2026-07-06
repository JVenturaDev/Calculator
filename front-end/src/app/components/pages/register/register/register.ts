import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceApiService } from '../../../../services/workspace-api-service/workspace-api-service';
import { Router } from '@angular/router';
import { ToastService } from '../../../../services/toast-services/toast';
import { AuthSessionService } from '../../../../services/auth/auth-session';
import { DemoEnvironmentService } from '../../../../services/auth/demo-environment';
@Component({
  selector: 'app-register',
  imports: [FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  username = '';
  password = '';
  error = '';
  constructor(
    private api: WorkspaceApiService,
    private router: Router,
    private toast: ToastService,
    private authSession: AuthSessionService,
    private demoEnvironment: DemoEnvironmentService
  ) { }
  register() {
    this.api.register(this.username, this.password).subscribe({
      next: () => {
        this.authSession.clearDemoGuest();
        this.toast.success('Registro completado. Ya puedes iniciar sesión.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Registration failed', err);
        this.error = 'user invalido';
      }
    });
  }
  continueAsGuest() {
    if (this.demoEnvironment.isDemoAllowed()) {
      this.authSession.startDemoGuest();
      this.router.navigate(['/main']);
      return;
    }

    this.api.guest().subscribe({
      next: () => {
        this.authSession.clearDemoGuest();
        this.router.navigate(['/main']);
      },
      error: () => { "Error de capa 8" }
    });
  }
  goLogin() { this.router.navigate(['/login']); }

}
