import { Injectable } from '@angular/core';
import Complex from 'complex.js';

export type NeutroNode = {
  type: 'Operator' | 'Function' | 'Literal';
  name?: string;
  operands?: NeutroNode[];
  value?: number | Complex;
  result?: number | Complex;
};
export type HumanStep = {
  type: 'expression' | 'operator' | 'function' | 'result'; 
  text: string;     
  level: number;      
  nodeId?: string;      
};


@Injectable({
  providedIn: 'root'
})
export class HumanRendererService {

  constructor() { }

  render(node: NeutroNode, level = 0): HumanStep[] {
    const steps: HumanStep[] = [];

    if (node.type === 'Literal') {
      return steps;
    }

    if (node.operands) {
      for (const child of node.operands) {
        steps.push(...this.render(child, level + 1));
      }
    }

    let text = '';
    switch(node.type) {
      case 'Operator':
        text = `${node.name}(${node.operands?.map(o => o.result ?? o.value).join(', ')}) = ${node.result}`;
        steps.push({ type: 'operator', text, level, nodeId: node.name });
        break;
      case 'Function':
        text = `${node.name}(${node.operands?.map(o => o.result ?? o.value).join(', ')}) = ${node.result}`;
        steps.push({ type: 'function', text, level, nodeId: node.name });
        break;
    }

    return steps;
  }

  renderFinalExpression(node: NeutroNode): HumanStep[] {
    const steps = this.render(node);
    steps.push({ type: 'result', text: `Resultado final: ${node.result}`, level: 0 });
    return steps;
  }
}
