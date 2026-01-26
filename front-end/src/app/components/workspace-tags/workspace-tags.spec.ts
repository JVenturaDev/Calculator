import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceTagsComponent } from './workspace-tags';

describe('WorkspaceTags', () => {
  let component: WorkspaceTagsComponent;
  let fixture: ComponentFixture<WorkspaceTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceTagsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkspaceTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
