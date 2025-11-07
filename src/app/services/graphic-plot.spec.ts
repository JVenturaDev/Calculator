import { TestBed } from '@angular/core/testing';

import { GraphicPlot } from './graphic-plot';

describe('GraphicPlot', () => {
  let service: GraphicPlot;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphicPlot);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
