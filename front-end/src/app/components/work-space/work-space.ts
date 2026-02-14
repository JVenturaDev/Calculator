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
import { HumanStep } from '../../services/calculation-renderers/human-render/human-renderer';
import { BookRenderLineComponent } from '../calculation-renderers-component/book-render/book-render-line/book-render-line';
import { CalculationParserService } from '../../services/calculation/calculation-parser';
import { TreeNodeComponent } from '../treeRenderComponent/tree-render/tree-render';
import { BookRenderer } from '../../services/book-renderer-service/book-renderer';
import { TreeRendererService } from '../../services/TreeRendererService/tree-render';
import { TreeNode } from '../treeRenderComponent/tree-render/tree-render';
import { BookStep } from '../../services/book-renderer-service/book-renderer';
import { HumanRenderLineComponent } from '../calculation-renderers-component/human-render-line/human-render-line';

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
// porque opcional(?), me da pereza meterlos a la db 
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
  imports: [CommonModule, FormsModule, WorkspaceTagsComponent, BookRenderLineComponent, TreeNodeComponent, HumanRenderLineComponent]
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
  get activeItem(): WorkspaceItem | undefined {
    return this.workspaceItems.find(i => i.id === this.activeItemId);
  }

  constructor(
    private cd: ChangeDetectorRef,
    public wsService: WorkspaceService,
    public inputService: InputService,
    private tokenizer: Tokenizer,
    private parserService: parser,
    private evaluatorPolish: evaluator,
    public serviseParserN: CalculationParserService,
    public bookRenderer: BookRenderer,
    public treeRenderer: TreeRendererService,
  ) { }

  ngOnInit(): void {
    // Suscripción a workspaceItems$
    this.wsService.workspaceItems$.subscribe(items => {
      this.workspaceItems = items;
      this.generateActiveItemSteps();
    });

    // Suscripción a activeItemId$
    this.wsService.activeItemId$.subscribe(id => {
      this.activeItemId = id;
      this.generateActiveItemSteps();
    });

    // Suscripción a target$ para el foco
    this.inputService.target$.subscribe(target => {
      if (target.type === 'workspace-item') {
        this.focusInput(target.itemId);
      }
    });
  }

private generateActiveItemSteps() {
  this.trees.clear(); 

  if (!this.activeItemId) return;

  const item = this.workspaceItems.find(i => i.id === this.activeItemId);
  if (!item) return;

  item.calculations.forEach(calc => {
    if (!calc.steps?.length) return;

    calc.id ??= crypto.randomUUID();

    const ir = this.serviseParserN.parse(calc.steps);

    this.trees.set(calc.id, this.treeRenderer.buildTree(ir));
    calc.humanSteps = this.convertToHumanSteps(calc.steps);
    calc.bookSteps = this.bookRenderer.convertToBookSteps(calc.steps);
  });
}


  convertToHumanSteps(steps: Step[]): HumanStep[] {
    return steps.map(s => {
      const format = (v: number | Complex) => this.serviseParserN.formatValue(v);

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
      id: crypto.randomUUID(),
      expression: item.currentExpression,
      result: evaluation.result,
      steps: evaluation.steps,
      timestamp: new Date()
    };
    const humanSteps: HumanStep[] = this.convertToHumanSteps(calc.steps);

    console.table(humanSteps);

    console.log('WorkspaceCalculation:', calc);
    this.wsService.addCalculationToActiveItem(calc);
    setTimeout(() => this.activateItem(activeId));
  }

  pressButton(value: string) {
    const target = this.inputService.target; if (target.type === 'calculator') return; if (target.type === 'workspace-item') {
      this.wsService.appendToCurrentExpression(target.itemId, value);
    }
  }
}
