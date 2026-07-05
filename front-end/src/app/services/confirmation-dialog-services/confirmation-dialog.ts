import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type ConfirmationTone = 'default' | 'danger';

export interface ConfirmationDialogOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly tone?: ConfirmationTone;
}

export interface ConfirmationDialogRequest {
  readonly id: number;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly tone: ConfirmationTone;
}

interface PendingConfirmation {
  readonly request: ConfirmationDialogRequest;
  readonly resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeRequestState =
    signal<ConfirmationDialogRequest | null>(null);
  private readonly queue: PendingConfirmation[] = [];
  private activeConfirmation: PendingConfirmation | null = null;
  private nextId = 1;
  private destroyed = false;

  readonly activeRequest = this.activeRequestState.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.resolveAllAsCancelled();
    });
  }

  confirm(options: ConfirmationDialogOptions): Promise<boolean> {
    if (this.destroyed) return Promise.resolve(false);

    return new Promise<boolean>(resolve => {
      this.queue.push({
        request: {
          id: this.nextId++,
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'Confirmar',
          cancelLabel: options.cancelLabel ?? 'Cancelar',
          tone: options.tone ?? 'default',
        },
        resolve,
      });
      this.presentNext();
    });
  }

  accept(): void {
    this.resolveActive(true);
  }

  cancel(): void {
    this.resolveActive(false);
  }

  private resolveActive(confirmed: boolean): void {
    const active = this.activeConfirmation;
    if (!active) return;

    this.activeConfirmation = null;
    this.activeRequestState.set(null);
    active.resolve(confirmed);

    queueMicrotask(() => this.presentNext());
  }

  private presentNext(): void {
    if (this.destroyed || this.activeConfirmation || !this.queue.length) return;

    this.activeConfirmation = this.queue.shift() ?? null;
    this.activeRequestState.set(this.activeConfirmation?.request ?? null);
  }

  private resolveAllAsCancelled(): void {
    const active = this.activeConfirmation;
    this.activeConfirmation = null;
    this.activeRequestState.set(null);
    active?.resolve(false);

    this.queue.splice(0).forEach(pending => pending.resolve(false));
  }
}
