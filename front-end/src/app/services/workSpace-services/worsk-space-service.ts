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
import { Step } from '../polish-services/polish-evaluator';
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
    private zerialicer: CalculationMapper,
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

        const normalized = items.map(item => ({
          ...item,
          calculations: (item.calculations ?? []).map(calculation => ({
            ...calculation,
            id: calculation.id ?? crypto.randomUUID(),
            result: this.zerialicer.deserializeMaybe(calculation.result),
            steps: this.zerialicer.normalizeSteps(calculation.steps),
          })),
        }));

        this.workspaceItems$.next(normalized);
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

        this.workspaceItems$.next(
          this.workspaceItems$.value.map(item =>
            item.id === tempItem.id ? savedItem : item
          )
        );
        this.activeItemId$.next(savedItem.id);
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

    if (context.kind === 'demo') {
      this.workspaceItems$.next(
        this.workspaceItems$.value.map(item =>
          item.id === itemId
            ? { ...item, currentExpression: value, updatedAt: new Date() }
            : item
        )
      );
      this.persistDemoSnapshot();
      return;
    }

    if (context.kind !== 'real') return;

    this.api.updateExpression(itemId, value).subscribe(updatedItem => {
      if (!this.isContextCurrent(context.key)) return;

      this.workspaceItems$.next(
        this.workspaceItems$.value.map(item =>
          item.id === itemId ? updatedItem : item
        )
      );
    });
  }

  updateCurrentExpression(itemId: string, value: string): void {
    const context = this.prepareCurrentContext();
    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === itemId ? { ...item, currentExpression: value } : item
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
              currentExpression: item.currentExpression + value,
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

    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === activeId
          ? {
              ...item,
              calculations: [...item.calculations, calc],
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

    const stepsForBackend = calc.steps.map(step => ({
      ...step,
      result:
        step.result instanceof Complex
          ? this.zerialicer.serializeResult(step.result)
          : step.result,
    }));

    const calcToSend: CalculationDTO = {
      expression: calc.expression,
      result: this.zerialicer.serializeResult(calc.result),
      steps: JSON.stringify(stepsForBackend),
    };

    this.api.addCalculationDTO(activeId, calcToSend).subscribe(savedCalc => {
      if (!this.isContextCurrent(context.key)) return;

      const parsedResult: number | Complex =
        this.zerialicer.deserializeResult(savedCalc.result);
      const parsedSteps: Step[] = (
        savedCalc.steps as unknown as Step[]
      ).map(step => ({
        ...step,
        result:
          typeof step.result === 'string'
            ? this.zerialicer.deserializeResult(step.result)
            : step.result,
      }));

      this.workspaceItems$.next(
        this.workspaceItems$.value.map(item =>
          item.id === activeId
            ? {
                ...item,
                calculations: [
                  ...item.calculations.slice(0, -1),
                  { ...calc, result: parsedResult, steps: parsedSteps },
                ],
              }
            : item
        )
      );
    });
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
