import { TestBed } from '@angular/core/testing';

import { TreeRendererService } from './tree-render';

describe('TreeRendererService', () => {
  let service: TreeRendererService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TreeRendererService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
