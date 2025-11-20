import { TestBed } from '@angular/core/testing';

import { PreprocessModule } from './preprocess-module';

describe('PreprocessModule', () => {
  let service: PreprocessModule;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PreprocessModule);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
