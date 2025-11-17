import { TestBed } from '@angular/core/testing';

import { GraphicPlotService } from './graphic-plot';

describe('GraphicPlot', () => {
  let service: GraphicPlotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphicPlotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
