import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
  readonly duration: number | null;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly messagesState = signal<readonly ToastMessage[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly messages = this.messagesState.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  success(message: string, duration: number | null = 4000): number {
    return this.show('success', message, duration);
  }

  error(message: string, duration: number | null = null): number {
    return this.show('error', message, duration);
  }

  info(message: string, duration: number | null = 5000): number {
    return this.show('info', message, duration);
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this.messagesState.update(messages =>
      messages.filter(message => message.id !== id)
    );
  }

  clear(): void {
    this.clearTimers();
    this.messagesState.set([]);
  }

  private show(
    kind: ToastKind,
    message: string,
    duration: number | null
  ): number {
    const id = this.nextId++;
    this.messagesState.update(messages => [
      ...messages,
      { id, kind, message, duration },
    ]);

    if (duration !== null && duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration)
      );
    }

    return id;
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer === undefined) return;

    clearTimeout(timer);
    this.timers.delete(id);
  }

  private clearTimers(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}
