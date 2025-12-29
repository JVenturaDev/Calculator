import { Component, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputService } from '../../services/input-services/input-services';
import { Tokenizer } from '../../services/polish-services/tokenizer';
import { parser } from '../../services/polish-services/polish-notation-parser-service';
import { evaluator, Step } from '../../services/polish-services/polish-evaluator';
import { WorkspaceTagsComponent } from '../workspace-tags/workspace-tags';
import Complex from 'complex.js';
import { WorkspaceService } from '../../services/workSpace-services/worsk-space-service';
import { ChangeDetectorRef } from '@angular/core';

export interface WorkspaceItem {
  id: string;
  title: string;
  type: 'scientific' | 'graphical';
  currentExpression: string;
  calculations: WorkspaceCalculation[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceCalculation {
  expression: string;
  result: number | Complex;
  steps: Step[];
  timestamp: Date;
}

@Component({
  selector: 'app-work-space',
  standalone: true,
  templateUrl: './work-space.html',
  styleUrls: ['./work-space.css'],
  imports: [CommonModule, FormsModule, WorkspaceTagsComponent]
})
export class WorkSpace implements OnInit {

  workspaceItems: WorkspaceItem[] = [];
  activeItemId: string | null = null;

  creatingItem = false;
  newItemTitle = '';
  newItemTags: string[] = [];

  @ViewChildren('workspaceInput') workspaceInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private cd: ChangeDetectorRef,
    public wsService: WorkspaceService,
    public inputService: InputService,
    private tokenizer: Tokenizer,
    private parserService: parser,
    private evaluatorPolish: evaluator
  ) { }

  ngOnInit(): void {
    this.wsService.workspaceItems$.subscribe(items => this.workspaceItems = items);

    this.wsService.activeItemId$.subscribe(id => this.activeItemId = id);

    this.inputService.target$.subscribe(target => {
      if (target.type === 'workspace-item') {
        this.focusInput(target.itemId);
      }
    });
  }

  activateItem(id: string) {
    this.activeItemId = id;
    this.wsService.setActiveItem(id);
    this.inputService.setWorkspaceItemTarget(id);

    this.cd.detectChanges();

    const input = this.workspaceInputs.find((el, i) => this.workspaceItems[i].id === id);
    input?.nativeElement.focus();
  }

  trackById(_index: number, item: WorkspaceItem) {
    return item.id;
  }

  focusInput(itemId: string) {
    const index = this.workspaceItems.findIndex(i => i.id === itemId);
    this.cd.detectChanges(); 
    const input = this.workspaceInputs.get(index);
    input?.nativeElement.focus();
  }

  saveNewItem() {
    this.wsService.createItem({
      title: this.newItemTitle || 'Nuevo cálculo',
      type: 'scientific',
      tags: [...this.newItemTags]
    });
    this.newItemTitle = '';
    this.newItemTags = [];
    this.creatingItem = false;
  }

  evaluateWorkspaceItem() {
    const activeId = this.activeItemId;
    if (!activeId) return;

    const item = this.workspaceItems.find(i => i.id === activeId);
    if (!item || !item.currentExpression) return;

    const tokens = this.tokenizer.tokenize(item.currentExpression);
    const postfix = this.parserService.toPostFix(tokens);
    const evaluation = this.evaluatorPolish.evaluatePostFix(postfix, {}, true);

    if (typeof evaluation !== 'object' || !('steps' in evaluation)) return;

    const calc: WorkspaceCalculation = {
      expression: item.currentExpression,
      result: evaluation.result,
      steps: evaluation.steps,
      timestamp: new Date()
    };

    this.wsService.addCalculationToActiveItem(calc);
    setTimeout(() => this.activateItem(activeId));
  }

  pressButton(value: string) {
    const target = this.inputService.target; if (target.type === 'calculator') return; if (target.type === 'workspace-item') {
      this.wsService.appendToCurrentExpression(target.itemId, value); 
    }
  }
}
