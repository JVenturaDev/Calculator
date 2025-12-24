import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-workspace-tags',
  templateUrl: './workspace-tags.html',
  styleUrls: ['./workspace-tags.css'],
  imports: [FormsModule, CommonModule]
})
export class WorkspaceTagsComponent {

  @Input() tags: string[] = [];

  inputValue = '';

  addTag() {
    const value = this.inputValue.trim();
    if (!value || this.exists(value)) return;

    this.tags.push(value);
    this.inputValue = '';
  }

  removeTag(tag: string) {
    this.tags = this.tags.filter(t => t !== tag);
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
    }
  }
}
