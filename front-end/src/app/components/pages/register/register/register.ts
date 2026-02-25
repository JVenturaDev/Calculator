import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceApiService } from '../../../../services/workspaceApiService/workspace-api-service';
import { Router } from '@angular/router';
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
    private router: Router
  ) { }
  register() {
    this.api.register(this.username, this.password).subscribe({
      next: () => {
        alert('registered');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.log(err);
        this.error = 'user invalido';
      }
    });
  }
}
