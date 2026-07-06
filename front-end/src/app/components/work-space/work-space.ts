import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputService } from '../../services/input-services/input-services';
import { Tokenizer } from '../../services/polish-services/tokenizer';
import { parser } from '../../services/polish-services/polish-notation-parser-service';
import { evaluator, Step } from '../../services/polish-services/polish-evaluator';
import { WorkspaceTagsComponent } from '../workspace-tags/workspace-tags';
import Complex from 'complex.js';
import { WorkspaceService } from '../../services/workSpace-services/worsk-space-service';
import { HumanStep } from '../../services/calculation-renderers/human-render/human-renderer';
import { BookRenderLineComponent } from '../calculation-renderers-component/book-render/book-render-line/book-render-line';
import { CalculationParserService } from '../../services/calculation/calculation-parser';
import { BookRenderer } from '../../services/book-renderer-service/book-renderer';
import { TreeRendererService } from '../../services/TreeRendererService/tree-render';
import { TreeNode } from '../treeRenderComponent/tree-render/tree-render';
import { BookStep } from '../../services/book-renderer-service/book-renderer';
import { HumanRenderLineComponent } from '../calculation-renderers-component/human-render-line/human-render-line';
import { TreeViewportComponent } from '../treeRenderComponent/tree-viewport/tree-viewport';
import { ConfirmationDialogService } from '../../services/confirmation-dialog-services/confirmation-dialog';

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
  id?: string,
  humanSteps?: HumanStep[];
  bookSteps?: BookStep[];
}


export interface CalculationDTO {
  expression: string;
  result: string;
  steps: string;
}


@Component({
  selector: 'app-work-space',
  standalone: true,
  templateUrl: './work-space.html',
  styleUrls: ['./work-space.css'],
  imports: [CommonModule, FormsModule, WorkspaceTagsComponent, BookRenderLineComponent, TreeViewportComponent, HumanRenderLineComponent]
})
export class WorkSpace implements OnInit {
  trees = new Map<string, TreeNode>();

  workspaceItems: WorkspaceItem[] = [];
  activeItemId: string | null = null;

  creatingItem = false;
  newItemTitle = '';
  newItemTags: string[] = [];
  viewMode: 'human' | 'book' | 'tree' = 'human';

  setViewMode(mode: 'human' | 'book' | 'tree') {
    this.viewMode = mode;
  }
  @ViewChildren('workspaceInput') workspaceInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private cd: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    public wsService: WorkspaceService,
    public inputService: InputService,
    private tokenizer: Tokenizer,
    private parserService: parser,
    private evaluatorPolish: evaluator,
    public calculationParser: CalculationParserService,
    public bookRenderer: BookRenderer,
    public treeRenderer: TreeRendererService,
    private confirmation: ConfirmationDialogService,
  ) { }

  ngOnInit(): void {
    this.wsService.initializeForCurrentSession();

    // Suscripción a workspaceItems$
    this.wsService.workspaceItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(items => {
        this.workspaceItems = items;
        this.generateActiveItemSteps();
      });

    // Suscripción a activeItemId$
    this.wsService.activeItemId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.activeItemId = id;
        this.generateActiveItemSteps();
      });

    // Suscripción a target$ para el foco
    this.inputService.target$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(target => {
        if (target.type === 'workspace-item') {
          this.focusActiveInput(target.itemId);
        }
      });
  }
  async onDeleteItem(itemId: string): Promise<void> {
    const item = this.workspaceItems.find(candidate => candidate.id === itemId);
    const title = item?.title ?? 'este espacio';
    const confirmed = await this.confirmation.confirm({
      title: 'Eliminar espacio',
      message: `¿Quieres eliminar “${title}”? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) return;
    this.wsService.deleteItem(itemId);
  }


  generateActiveItemSteps() {
    this.trees.clear();
    if (!this.activeItemId) return;

    const t = this.workspaceItems.find(o => o.id === this.activeItemId);

    (t?.calculations ?? []).forEach(o => {
      if (!o.steps?.length) return;

      o.id ??= crypto.randomUUID();
      const I = this.calculationParser.parse(o.steps);
      this.trees.set(o.id, this.treeRenderer.buildTree(I));
      o.humanSteps = this.convertToHumanSteps(o.steps);
      o.bookSteps = this.bookRenderer.convertToBookSteps(o.steps);
    });
  }

  convertToHumanSteps(steps: Step[]): HumanStep[] {
    return steps.map(s => {
      const format = (v: number | Complex) => this.calculationParser.formatValue(v);

      let text: string;
      if (s.type === "Operator") {
        text = `${format(s.operands[0])} ${s.name} ${format(s.operands[1])} = ${format(s.result)}`;
      } else {
        text = `${s.name}(${s.operands.map(format).join(", ")}) = ${format(s.result)}`;
      }

      return {
        text,
        level: 0,
        type: s.type === "Operator" ? 'operator' : 'function',
        name: s.name
      };
    });
  }





  activateItem(id: string) {
    this.activeItemId = id;
    this.wsService.setActiveItem(id);
    this.inputService.setWorkspaceItemTarget(id);
  }

  trackById(_index: number, item: WorkspaceItem) {
    return item.id;
  }

  private focusActiveInput(itemId: string): void {
    if (this.activeItemId !== itemId) return;

    this.cd.detectChanges();
    this.workspaceInputs.first?.nativeElement.focus();
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
      id: crypto.randomUUID(),
      expression: item.currentExpression,
      result: evaluation.result,
      steps: evaluation.steps,
      timestamp: new Date()
    };
    this.wsService.addCalculationToActiveItem(calc);
    this.focusActiveInput(activeId);
  }

  pressButton(value: string) {
    const target = this.inputService.target; if (target.type === 'calculator') return; if (target.type === 'workspace-item') {
      this.wsService.appendToCurrentExpression(target.itemId, value);
    }
  }
}
