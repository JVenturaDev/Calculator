import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Complex from 'complex.js';

import {
  CalculationDTO,
  WorkspaceCalculation,
  WorkspaceItem,
} from '../../components/work-space/work-space';
import { AuthSessionService } from '../auth/auth-session';
import { CalculationMapper } from '../mappers/calculation-mapper';
import { ToastService } from '../toast-services/toast';
import { WorkspaceApiService } from '../workspaceApiService/workspace-api-service';
import {
  DemoWorkspaceLoadIssue,
  DemoWorkspaceStorageService,
} from './demo-workspace-storage';

type WorkspaceContext =
  | { kind: 'demo'; key: 'demo' }
  | { kind: 'real'; key: string }
  | { kind: 'none'; key: 'none' };

type RawWorkspaceCalculation = {
  id?: unknown;
  expression?: unknown;
  result?: unknown;
  steps?: unknown;
  timestamp?: unknown;
  humanSteps?: WorkspaceCalculation['humanSteps'];
  bookSteps?: WorkspaceCalculation['bookSteps'];
};

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  workspaceItems$ = new BehaviorSubject<WorkspaceItem[]>([]);
  activeItemId$ = new BehaviorSubject<string | null>(null);

  private initializedContextKey: string | null = null;
  private demoPersistenceSuspended = false;
  private demoPersistenceFailureNotified = false;

  constructor(
    private api: WorkspaceApiService,
    private calculationMapper: CalculationMapper,
    private authSession: AuthSessionService,
    private demoStorage: DemoWorkspaceStorageService,
    private toast: ToastService
  ) {
    this.initializeForCurrentSession();
  }

  get activeItem(): WorkspaceItem | null {
    const id = this.activeItemId$.value;
    if (!id) return null;
    return this.workspaceItems$.value.find(item => item.id === id) ?? null;
  }

  initializeForCurrentSession(): void {
    const context = this.getCurrentContext();
    if (this.initializedContextKey === context.key) return;

    this.initializedContextKey = context.key;
    this.demoPersistenceSuspended = false;
    this.demoPersistenceFailureNotified = false;
    this.workspaceItems$.next([]);
    this.activeItemId$.next(null);

    if (context.kind === 'demo') {
      const diagnostic = this.demoStorage.loadWithDiagnostics();
      const snapshot = diagnostic.snapshot;
      if (diagnostic.issue) {
        this.reportDemoLoadIssue(diagnostic.issue, diagnostic.error);
      }
      const activeItemId = snapshot.items.some(
        item => item.id === snapshot.activeItemId
      )
        ? snapshot.activeItemId
        : null;

      this.workspaceItems$.next(snapshot.items);
      this.activeItemId$.next(activeItemId);
      return;
    }

    if (context.kind === 'real') {
      this.api.getItems().subscribe(items => {
        if (!this.isContextCurrent(context.key)) return;

        this.workspaceItems$.next(
          items.map(item => this.normalizeWorkspaceItem(item))
        );
      });
    }
  }

  createItem(data: {
    title: string;
    type: 'scientific' | 'graphical';
    tags: string[];
  }): void {
    const context = this.prepareCurrentContext();
    const tempItem: WorkspaceItem = {
      id: crypto.randomUUID(),
      title: data.title,
      type: data.type,
      tags: data.tags,
      currentExpression: '',
      calculations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workspaceItems$.next([...this.workspaceItems$.value, tempItem]);
    this.activeItemId$.next(tempItem.id);

    if (context.kind === 'demo') {
      this.persistDemoSnapshot();
      return;
    }

    if (context.kind !== 'real') return;

    this.api.createItem(data).subscribe({
      next: savedItem => {
        if (!this.isContextCurrent(context.key)) return;

        const optimisticItem =
          this.workspaceItems$.value.find(item => item.id === tempItem.id) ??
          tempItem;
        const normalizedSavedItem = this.normalizeWorkspaceItem({
          ...optimisticItem,
          ...savedItem,
          currentExpression:
            savedItem.currentExpression ??
            optimisticItem.currentExpression ??
            '',
          calculations:
            savedItem.calculations ?? optimisticItem.calculations ?? [],
          tags: savedItem.tags ?? optimisticItem.tags ?? [],
        });

        this.workspaceItems$.next(
          this.workspaceItems$.value.map(item =>
            item.id === tempItem.id ? normalizedSavedItem : item
          )
        );
        this.activeItemId$.next(normalizedSavedItem.id);
      },
      error: () => {},
    });
  }

  updateTags(itemId: string, tags: string[]): void {
    const context = this.prepareCurrentContext();
    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === itemId
          ? { ...item, tags, updatedAt: new Date() }
          : item
      )
    );

    if (context.kind === 'demo') {
      this.persistDemoSnapshot();
      return;
    }

    if (context.kind !== 'real') return;

    this.api.updateTags(itemId, tags).subscribe({
      error: error => console.error('Error updating tags', error),
    });
  }

  setActiveItem(id: string): void {
    const context = this.prepareCurrentContext();
    this.activeItemId$.next(id);
    if (context.kind === 'demo') this.persistDemoSnapshot();
  }

  clearActiveItem(): void {
    const context = this.prepareCurrentContext();
    this.activeItemId$.next(null);
    if (context.kind === 'demo') this.persistDemoSnapshot();
  }

  updateExpression(itemId: string, value: string): void {
    const context = this.prepareCurrentContext();
    const normalizedValue = value ?? '';

    if (context.kind === 'demo') {
      this.workspaceItems$.next(
        this.workspaceItems$.value.map(item =>
          item.id === itemId
            ? {
                ...item,
                currentExpression: normalizedValue,
                updatedAt: new Date(),
              }
            : item
        )
      );
      this.persistDemoSnapshot();
      return;
    }

    if (context.kind !== 'real') return;

    this.api.updateExpression(itemId, normalizedValue).subscribe(updatedItem => {
      if (!this.isContextCurrent(context.key)) return;

      this.workspaceItems$.next(
        this.workspaceItems$.value.map(item => {
          if (item.id !== itemId) return item;

          return this.normalizeWorkspaceItem({
            ...item,
            ...updatedItem,
            currentExpression:
              updatedItem.currentExpression ?? normalizedValue,
            calculations:
              updatedItem.calculations ?? item.calculations ?? [],
            tags: updatedItem.tags ?? item.tags ?? [],
          });
        })
      );
    });
  }

  updateCurrentExpression(itemId: string, value: string): void {
    const context = this.prepareCurrentContext();
    const normalizedValue = value ?? '';
    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === itemId
          ? { ...item, currentExpression: normalizedValue }
          : item
      )
    );
    if (context.kind === 'demo') this.persistDemoSnapshot();
  }

  deleteItem(itemId: string): void {
    const context = this.prepareCurrentContext();

    if (context.kind === 'demo') {
      this.removeLocalItem(itemId);
      this.persistDemoSnapshot();
      return;
    }

    if (context.kind !== 'real') return;

    this.api.deleteItem(itemId).subscribe({
      next: () => {
        if (!this.isContextCurrent(context.key)) return;
        this.removeLocalItem(itemId);
      },
      error: error => {
        console.error('DELETE error:', error);
      },
    });
  }

  appendToCurrentExpression(itemId: string, value: string): void {
    const context = this.prepareCurrentContext();
    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === itemId
          ? {
              ...item,
              currentExpression: (item.currentExpression ?? '') + value,
              updatedAt: new Date(),
            }
          : item
      )
    );
    if (context.kind === 'demo') this.persistDemoSnapshot();
  }

  clearCurrentExpression(itemId: string): void {
    this.updateCurrentExpression(itemId, '');
  }

  addCalculationToActiveItem(calc: WorkspaceCalculation): void {
    const context = this.prepareCurrentContext();
    const activeId = this.activeItemId$.value;
    if (!activeId) return;
    const normalizedCalculation =
      this.normalizeWorkspaceCalculation(calc);

    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === activeId
          ? {
              ...item,
              calculations: [
                ...(item.calculations ?? []),
                normalizedCalculation,
              ],
              currentExpression: '',
              updatedAt: new Date(),
            }
          : item
      )
    );

    if (context.kind === 'demo') {
      this.persistDemoSnapshot();
      return;
    }

    if (context.kind !== 'real') return;

    const stepsForBackend = normalizedCalculation.steps.map(step => ({
      ...step,
      result:
        step.result instanceof Complex
          ? this.calculationMapper.serializeResult(step.result)
          : step.result,
    }));

    const calcToSend: CalculationDTO = {
      expression: normalizedCalculation.expression,
      result: this.calculationMapper.serializeResult(normalizedCalculation.result),
      steps: JSON.stringify(stepsForBackend),
    };

    this.api.addCalculationDTO(activeId, calcToSend).subscribe(savedCalc => {
      if (!this.isContextCurrent(context.key)) return;

      const normalizedSavedCalculation =
        this.normalizeWorkspaceCalculation(
          savedCalc as unknown as RawWorkspaceCalculation,
          normalizedCalculation
        );

      this.workspaceItems$.next(
        this.workspaceItems$.value.map(item =>
          item.id === activeId
            ? {
                ...item,
                calculations: [
                  ...(item.calculations ?? []).slice(0, -1),
                  normalizedSavedCalculation,
                ],
              }
            : item
        )
      );
    });
  }

  private normalizeWorkspaceItem(item: WorkspaceItem): WorkspaceItem {
    return {
      ...item,
      currentExpression: item.currentExpression ?? '',
      calculations: (item.calculations ?? []).map(calculation =>
        this.normalizeWorkspaceCalculation(calculation)
      ),
      tags: item.tags ?? [],
    };
  }

  private normalizeWorkspaceCalculation(
    calculation: RawWorkspaceCalculation,
    fallback?: WorkspaceCalculation
  ): WorkspaceCalculation {
    const rawTimestamp = calculation.timestamp ?? fallback?.timestamp;
    const parsedTimestamp =
      rawTimestamp instanceof Date
        ? rawTimestamp
        : new Date(String(rawTimestamp ?? ''));
    const timestamp = Number.isNaN(parsedTimestamp.getTime())
      ? fallback?.timestamp ?? new Date()
      : parsedTimestamp;

    return {
      ...fallback,
      id:
        typeof calculation.id === 'string'
          ? calculation.id
          : fallback?.id ?? crypto.randomUUID(),
      expression:
        typeof calculation.expression === 'string'
          ? calculation.expression
          : fallback?.expression ?? '',
      result: this.calculationMapper.deserializeMaybe(
        calculation.result ?? fallback?.result ?? 0
      ),
      steps: this.calculationMapper.normalizeSteps(
        calculation.steps ?? fallback?.steps ?? []
      ),
      timestamp,
      ...(calculation.humanSteps
        ? { humanSteps: calculation.humanSteps }
        : fallback?.humanSteps
          ? { humanSteps: fallback.humanSteps }
          : {}),
      ...(calculation.bookSteps
        ? { bookSteps: calculation.bookSteps }
        : fallback?.bookSteps
          ? { bookSteps: fallback.bookSteps }
          : {}),
    };
  }

  private prepareCurrentContext(): WorkspaceContext {
    this.initializeForCurrentSession();
    return this.getCurrentContext();
  }

  private getCurrentContext(): WorkspaceContext {
    if (this.authSession.isDemoGuest()) {
      return { kind: 'demo', key: 'demo' };
    }

    const token = this.authSession.getRealToken();
    return token
      ? { kind: 'real', key: `real:${token}` }
      : { kind: 'none', key: 'none' };
  }

  private isContextCurrent(expectedKey: string): boolean {
    return (
      this.initializedContextKey === expectedKey &&
      this.getCurrentContext().key === expectedKey
    );
  }

  private persistDemoSnapshot(): void {
    if (this.demoPersistenceSuspended) return;

    try {
      this.demoStorage.save({
        version: 1,
        activeItemId: this.activeItemId$.value,
        items: this.workspaceItems$.value,
      });
    } catch (error) {
      this.demoPersistenceSuspended = true;
      if (this.demoPersistenceFailureNotified) return;

      this.demoPersistenceFailureNotified = true;
      console.error('Error saving demo workspace:', error);
      this.toast.error(this.getDemoSaveErrorMessage(error), 8000);
    }
  }

  private removeLocalItem(itemId: string): void {
    this.workspaceItems$.next(
      this.workspaceItems$.value.filter(item => item.id !== itemId)
    );
    if (this.activeItemId$.value === itemId) {
      this.activeItemId$.next(null);
    }
  }

  private reportDemoLoadIssue(
    issue: DemoWorkspaceLoadIssue,
    error?: unknown
  ): void {
    if (error !== undefined) {
      console.error('Error loading demo workspace:', error);
    }

    switch (issue) {
      case 'corrupt':
        this.toast.error(
          'No se pudieron recuperar los datos locales del Workspace demo. Se inició un espacio vacío.',
          8000
        );
        return;
      case 'unsupported-version':
        this.demoPersistenceSuspended = true;
        this.toast.error(
          'Los datos locales del Workspace demo pertenecen a una versión incompatible. Se inició un espacio vacío.',
          8000
        );
        return;
      case 'unavailable':
        this.demoPersistenceSuspended = true;
        this.toast.error(
          'El navegador bloqueó el almacenamiento del Workspace demo. Los cambios se conservarán solo durante esta sesión.',
          8000
        );
    }
  }

  private getDemoSaveErrorMessage(error: unknown): string {
    const name =
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      typeof error.name === 'string'
        ? error.name
        : '';

    if (name === 'QuotaExceededError') {
      return 'El almacenamiento del Workspace demo está lleno. Los nuevos cambios se conservarán solo durante esta sesión.';
    }

    if (name === 'SecurityError') {
      return 'El navegador bloqueó el almacenamiento del Workspace demo. Los cambios se conservarán solo durante esta sesión.';
    }

    return 'No se pudieron guardar los cambios del Workspace demo. Continuarán disponibles mientras esta página permanezca abierta.';
  }
}
