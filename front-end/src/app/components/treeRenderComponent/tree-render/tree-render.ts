import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TreeNode {
  label: string;
  children: TreeNode[];
}

@Component({
  selector: 'app-tree-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-render.html',
  styleUrls: ['./tree-render.css']
})
export class TreeNodeComponent {
  @Input() node!: TreeNode;
}
