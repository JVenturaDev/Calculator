import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../services/workSpace-services/worsk-space-service';


@Component({
  selector: 'app-workspace-tags',
  templateUrl: './workspace-tags.html',
  styleUrls: ['./workspace-tags.css'],
  imports: [FormsModule, CommonModule]
})
export class WorkspaceTagsComponent {

  @Input() tags: string[] = [];
  @Input() itemId!: string;
  @Output() tagsChange = new EventEmitter<string[]>();

  inputValue = '';
  constructor(private wsService: WorkspaceService) { }
  addTag() {
    const value = this.inputValue.trim();
    if (!value || this.exists(value)) return;

    this.tags.push(value);
    this.tagsChange.emit([...this.tags]);
    this.inputValue = '';
  }


  removeTag(tag: string) {
    this.tags = this.tags.filter(t => t !== tag);
    this.tagsChange.emit([...this.tags]); 
  }

  updateBackendTags() {
    if (!this.itemId) return;
    this.wsService.updateTags(this.itemId, this.tags);
  }

  exists(value: string): boolean {
    return this.tags.includes(value);
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag();
    }

    if (event.key === 'Backspace' && this.inputValue === '' && this.tags.length) {
      this.tags.pop();
      this.tagsChange.emit([...this.tags]);
    }

  }
}
