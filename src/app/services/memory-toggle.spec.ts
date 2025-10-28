import { TestBed } from '@angular/core/testing';

import { MemoryToggleService } from './memory-toggle';

describe('MemoryToggle', () => {
  let service: MemoryToggleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MemoryToggleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
