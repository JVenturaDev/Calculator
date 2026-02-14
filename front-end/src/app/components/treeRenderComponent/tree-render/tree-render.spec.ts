import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeRender } from './tree-render';

describe('TreeRender', () => {
  let component: TreeRender;
  let fixture: ComponentFixture<TreeRender>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeRender]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeRender);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
