import { TestBed } from '@angular/core/testing';

import { TreeRender } from './tree-render';

describe('TreeRender', () => {
  let service: TreeRender;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TreeRender);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
