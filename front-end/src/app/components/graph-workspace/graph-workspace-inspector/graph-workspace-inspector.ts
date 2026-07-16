import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { type GraphCanvasHover } from '../graph-canvas/graph-canvas';
import {
  type GraphFunctionSample,
  type GraphFunctionSampleStatus,
} from '../../../services/graph-workspace/graph-sampling';
import {
  type GraphFunction,
  type GraphViewport2D,
} from '../../../services/graph-workspace/graph-workspace-state';

export interface GraphWorkspaceInspectorSummary {
  readonly totalFunctions: number;
  readonly visibleFunctions: number;
  readonly readyFunctions: number;
  readonly invalidFunctions: number;
  readonly unsupportedFunctions: number;
}

@Component({
  selector: 'app-graph-workspace-inspector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graph-workspace-inspector.html',
  styleUrls: ['./graph-workspace-inspector.css'],
})
export class GraphWorkspaceInspectorComponent {
  @Input() selectedFunction: GraphFunction | null = null;
  @Input() selectedSample: GraphFunctionSample | null = null;
  @Input({ required: true }) viewport!: GraphViewport2D;
  @Input({ required: true }) summary!: GraphWorkspaceInspectorSummary;
  @Input() error: string | null = null;
  @Input() hoveredPoint: GraphCanvasHover | null = null;

  statusLabel(status: GraphFunctionSampleStatus | null | undefined): string {
    switch (status) {
      case 'ready':
        return 'Lista';
      case 'hidden':
        return 'Oculta';
      case 'empty':
        return 'Vacía';
      case 'invalid':
        return 'Inválida';
      case 'unsupported':
        return 'Incompatible';
      default:
        return 'Sin muestra';
    }
  }

  visibleLabel(visible: boolean): string {
    return visible ? 'Visible' : 'Oculta';
  }

  plotKindLabel(plotKind: GraphFunction['plotKind']): string {
    return plotKind === 'line' ? 'Line' : 'Contour';
  }
}
