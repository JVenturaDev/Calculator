import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WorkspaceItem, WorkspaceCalculation } from '../../components/work-space/work-space';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  workspaceItems$ = new BehaviorSubject<WorkspaceItem[]>([]);
  activeItemId$ = new BehaviorSubject<string | null>(null);

  get activeItem(): WorkspaceItem | null {
    const id = this.activeItemId$.value;
    if (!id) return null;
    return this.workspaceItems$.value.find(i => i.id === id) ?? null;
  }

  createItem(data: { title: string; type: 'scientific' | 'graphical'; tags: string[] }) {
    const now = new Date();
    const item: WorkspaceItem = {
      id: crypto.randomUUID(),
      title: data.title,
      type: data.type,
      currentExpression: '',
      calculations: [],
      tags: data.tags,
      createdAt: now,
      updatedAt: now
    };
    this.workspaceItems$.next([...this.workspaceItems$.value, item]);
    this.activeItemId$.next(item.id);
  }

  setActiveItem(id: string) {
    this.activeItemId$.next(id);
  }

  clearActiveItem() {
    this.activeItemId$.next(null);
  }

  updateCurrentExpression(itemId: string, value: string) {
    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === itemId ? { ...item, currentExpression: value } : item
      )
    );
  }

  appendToCurrentExpression(itemId: string, value: string) {
    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === itemId
          ? { ...item, currentExpression: item.currentExpression + value, updatedAt: new Date() }
          : item
      )
    );
  }

  clearCurrentExpression(itemId: string) {
    this.updateCurrentExpression(itemId, '');
  }

  addCalculationToActiveItem(calc: WorkspaceCalculation) {
    const activeId = this.activeItemId$.value;
    if (!activeId) return;

    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === activeId
          ? { ...item, calculations: [...item.calculations, calc], currentExpression: '', updatedAt: new Date() }
          : item
      )
    );
  }
}
