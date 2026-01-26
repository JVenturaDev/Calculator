import { TestBed } from '@angular/core/testing';

import { AppInitService } from './init-app';

describe('InitApp', () => {
  let service: AppInitService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppInitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
