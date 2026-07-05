import { Component, inject } from '@angular/core';

import { ToastService } from '../../services/toast-services/toast';

@Component({
  selector: 'app-toast-viewport',
  standalone: true,
  templateUrl: './toast-viewport.html',
  styleUrls: ['./toast-viewport.css'],
})
export class ToastViewportComponent {
  readonly toastService = inject(ToastService);

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
