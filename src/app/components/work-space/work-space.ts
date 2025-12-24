import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { WorkspaceTagsComponent } from '../workspace-tags/workspace-tags';
import { FormsModule } from '@angular/forms';
import { evaluator, Step } from '../../services/polish-services/polish-evaluator';
import Complex from 'complex.js';
import { parser } from '../../services/polish-services/polish-notation-parser-service';
import { Tokenizer } from '../../services/polish-services/tokenizer';
type WorkspaceItem = {
  id: string;
  title: string;
  expression: string;
  steps: Step[];
  tags: string[];
  results: (number | Complex)[];

}

@Component({
  selector: 'app-work-space',
  standalone: true,
  templateUrl: './work-space.html',
  styleUrl: './work-space.css',
  imports: [
    CommonModule,
    FormsModule,
    WorkspaceTagsComponent
  ]
})
export class WorkSpace {
  newItemTitle = '';
  newItemExpression = '';
  newItemTags: string[] = [];

  constructor(
    private evalutorPolish: evaluator,
    private parserService: parser,
    private tokenizer: Tokenizer,
  ) { }
  workspaceItems: WorkspaceItem[] = [];
  creatingItem = false;

  addWorkspaceItem(
    expression: string,
    result: number | Complex,
    steps: Step[],
    tags: string[],

  ) {
    const item: WorkspaceItem = {
      id: crypto.randomUUID(),
      title: this.newItemTitle || 'Nuevo calculo',
      expression,
      results: [result],
      steps: [...steps],
      tags
    };

    this.workspaceItems.push(item);

    this.newItemTitle = '';
    this.newItemExpression = '';
    this.newItemTags = [];
  }

  addCalculationToItem(itemId: string, newExpr: string, variables: Record<string, number> = {}) {
    const item = this.workspaceItems.find(i => i.id === itemId);
    if (!item) return;

    const evaluation = this.evalutorPolish.evaluatePostFix(
      this.parserService.toPostFix(this.tokenizer.tokenize(newExpr)),
      variables,
      true
    );

    if (typeof evaluation === 'object' && 'steps' in evaluation) {
      item.steps.push(...evaluation.steps);
      item.results.push(evaluation.result);
    }

    item.expression += ` ; ${newExpr}`;
  }
  saveNewItem() {
    const evaluation = this.evalutorPolish.evaluatePostFix(
      this.parserService.toPostFix(this.tokenizer.tokenize(this.newItemExpression)),
      {},
      true
    );

    if (typeof evaluation === 'object' && 'steps' in evaluation) {
      this.addWorkspaceItem(
        this.newItemExpression,
        evaluation.result,
        evaluation.steps,
        this.newItemTags
      );
    }

    this.creatingItem = false;
  }


}
