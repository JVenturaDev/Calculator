import { TestBed } from '@angular/core/testing';

import { BookRenderer } from './book-renderer';

describe('BookRendererService', () => {
  let service: BookRenderer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BookRenderer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
