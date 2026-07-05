import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import {
  TreeNode,
  TreeNodeComponent,
} from '../tree-render/tree-render';

@Component({
  selector: 'app-tree-viewport',
  standalone: true,
  imports: [CommonModule, TreeNodeComponent],
  templateUrl: './tree-viewport.html',
  styleUrls: ['./tree-viewport.css'],
})
export class TreeViewportComponent {
  @Input() node!: TreeNode;

  readonly minZoom = 0.5;
  readonly maxZoom = 1.5;
  readonly zoomStep = 0.1;
  zoom = 1;

  get zoomPercent(): number {
    return Math.round(this.zoom * 100);
  }

  get canZoomOut(): boolean {
    return this.zoom > this.minZoom;
  }

  get canZoomIn(): boolean {
    return this.zoom < this.maxZoom;
  }

  zoomOut(): void {
    this.setZoom(this.zoom - this.zoomStep);
  }

  resetZoom(): void {
    this.setZoom(1);
  }

  zoomIn(): void {
    this.setZoom(this.zoom + this.zoomStep);
  }

  private setZoom(value: number): void {
    const clamped = Math.min(this.maxZoom, Math.max(this.minZoom, value));
    this.zoom = Math.round(clamped * 10) / 10;
  }
}
