import {
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';

import { ConfirmationDialogService } from '../../services/confirmation-dialog-services/confirmation-dialog';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  templateUrl: './confirmation-dialog.html',
  styleUrls: ['./confirmation-dialog.css'],
})
export class ConfirmationDialogComponent {
  readonly confirmation = inject(ConfirmationDialogService);
  private readonly dialog =
    viewChild<ElementRef<HTMLDialogElement>>('dialogElement');
  private readonly cancelButton =
    viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  private previousFocus: HTMLElement | null = null;
  private displayedRequestId: number | null = null;

  constructor() {
    effect(() => {
      const request = this.confirmation.activeRequest();
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;

      if (request) {
        if (this.displayedRequestId !== request.id) {
          this.previousFocus =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          this.displayedRequestId = request.id;
        }

        if (!dialog.open) {
          dialog.showModal();
          queueMicrotask(() => this.cancelButton()?.nativeElement.focus());
        }
        return;
      }

      this.closeDialog();
    });
  }

  accept(): void {
    this.closeDialog();
    this.confirmation.accept();
  }

  cancel(): void {
    this.closeDialog();
    this.confirmation.cancel();
  }

  onNativeCancel(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) {
      this.cancel();
    }
  }

  private closeDialog(): void {
    const dialog = this.dialog()?.nativeElement;
    if (dialog?.open) dialog.close();

    const focusTarget = this.previousFocus;
    this.previousFocus = null;
    this.displayedRequestId = null;
    if (focusTarget?.isConnected) focusTarget.focus();
  }
}
