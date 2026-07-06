import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastViewportComponent } from './components/toast-viewport/toast-viewport';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [
    RouterOutlet,
    ToastViewportComponent,
    ConfirmationDialogComponent,
  ]
})
export class AppComponent {}

