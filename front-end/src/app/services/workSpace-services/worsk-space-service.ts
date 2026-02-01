import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WorkspaceItem, WorkspaceCalculation, CalculationDTO } from '../../components/work-space/work-space';
import { Step } from '../polish-services/polish-evaluator';
import { WorkspaceApiService } from '../workspaceApiService/workspace-api-service';
import { CalculationMapper } from '../mappers/calculation-mapper';
import Complex from 'complex.js';
@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  workspaceItems$ = new BehaviorSubject<WorkspaceItem[]>([]);
  activeItemId$ = new BehaviorSubject<string | null>(null);
  constructor(
    private api: WorkspaceApiService,
    private zerialicer: CalculationMapper,
  ) {
    this.api.getItems().subscribe(items => {
      this.workspaceItems$.next(items);
    });
  }
  get activeItem(): WorkspaceItem | null {
    const id = this.activeItemId$.value;
    if (!id) return null;
    return this.workspaceItems$.value.find(i => i.id === id) ?? null;
  }


  createItem(data: { title: string; type: 'scientific' | 'graphical'; tags: string[] }) {
    const tempItem: WorkspaceItem = {
      id: crypto.randomUUID(),
      title: data.title,
      type: data.type,
      tags: data.tags,
      currentExpression: '',
      calculations: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workspaceItems$.next([...this.workspaceItems$.value, tempItem]);
    this.activeItemId$.next(tempItem.id);

    this.api.createItem(data).subscribe({
      next: savedItem => {
        this.workspaceItems$.next(
          this.workspaceItems$.value.map(i =>
            i.id === tempItem.id ? savedItem : i
          )
        );
        this.activeItemId$.next(savedItem.id);
      },
      error: () => {

      }
    });
  }

  updateTags(itemId: string, tags: string[]) {
    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === itemId
          ? { ...item, tags, updatedAt: new Date() }
          : item
      )

    );
    console.log('Saving tags to backend:', itemId, tags);

    this.api.updateTags(itemId, tags).subscribe({
      error: err => console.error('Error updating tags', err)
    });
  }



  setActiveItem(id: string) {
    this.activeItemId$.next(id);
  }

  clearActiveItem() {
    this.activeItemId$.next(null);
  }

  updateExpression(itemId: string, value: string) {
    this.api.updateExpression(itemId, value).subscribe(updatedItem => {
      this.workspaceItems$.next(
        this.workspaceItems$.value.map(i => i.id === itemId ? updatedItem : i)
      );
    });
  }


  updateCurrentExpression(itemId: string, value: string) {
    this.workspaceItems$.next(
      this.workspaceItems$.value.map(item =>
        item.id === itemId ? { ...item, currentExpression: value } : item
      )
    );
  }
  deleteItem(itemId: string) {
    this.api.deleteItem(itemId).subscribe(() => {
      this.workspaceItems$.next(
        this.workspaceItems$.value.filter(i => i.id !== itemId)
      );
      if (this.activeItemId$.value === itemId) this.clearActiveItem();
    });
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
          ? {
            ...item,
            calculations: [...item.calculations, calc],
            currentExpression: '',
            updatedAt: new Date()
          }
          : item
      )
    );


    const stepsForBackend = calc.steps.map(s => ({
      ...s,
      result: s.result instanceof Complex ? this.zerialicer.serializeResult(s.result) : s.result
    }));

    const calcToSend: CalculationDTO = {
      expression: calc.expression,
      result: this.zerialicer.serializeResult(calc.result),
      steps: JSON.stringify(stepsForBackend)
    };



    this.api.addCalculationDTO(activeId, calcToSend).subscribe(savedCalc => {
      const parsedResult: number | Complex = this.zerialicer.deserializeResult(savedCalc.result);

      const parsedSteps: Step[] = (savedCalc.steps as unknown as Step[]).map(s => ({
        ...s,
        result: typeof s.result === 'string' ? this.zerialicer.deserializeResult(s.result) : s.result
      }));




      this.workspaceItems$.next(
        this.workspaceItems$.value.map(item =>
          item.id === activeId
            ? {
              ...item,
              calculations: [...item.calculations.slice(0, -1), { ...calc, result: parsedResult, steps: parsedSteps }]
            }
            : item
        )
      );
    });
  }


}
