import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceApiService } from '../../../../services/workspaceApiService/workspace-api-service';
import { Router } from '@angular/router';
import { ToastService } from '../../../../services/toast-services/toast';
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
    private toast: ToastService
  ) { }
  register() {
    this.api.register(this.username, this.password).subscribe({
      next: () => {
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
    this.api.guest().subscribe({
      next: () => this.router.navigate(['/main']),
      error: () => { "Error de capa 8" }
    });
  }
  goLogin() { this.router.navigate(['/login']); }

}
