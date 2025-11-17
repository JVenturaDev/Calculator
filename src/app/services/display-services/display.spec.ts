import { TestBed } from '@angular/core/testing';

import { DisplayComponent } from '../../components/display/display';

describe('Display', () => {
  let service: DisplayComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DisplayComponent);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
