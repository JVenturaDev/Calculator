import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphicPlot } from './graphic-plot';

describe('GraphicPlot', () => {
  let component: GraphicPlot;
  let fixture: ComponentFixture<GraphicPlot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphicPlot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphicPlot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
