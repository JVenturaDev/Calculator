import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceApiService } from '../../../services/workspaceApiService/workspace-api-service';
import { CommonModule } from '@angular/common';

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

  constructor(
    private api: WorkspaceApiService,
    private router: Router
  ) { }

  login() {
    this.api.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/main']);
      },
      error: () => {
        this.error = 'Credenciales inválidas';
      }
    });
  }
  continueAsGuest() {
    this.api.guest().subscribe({
      next: () => this.router.navigate(['/main']),
      error: () => { "Error de capa 8" }
    });
  }
  goRegister() { this.router.navigate(['/register']); }
}