import { TestBed } from '@angular/core/testing';

import { ToggleService } from './toggle'; 

describe('Toggle', () => {
  let service: ToggleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToggleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
