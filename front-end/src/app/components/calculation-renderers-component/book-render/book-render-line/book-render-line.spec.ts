import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookRenderLineComponent } from './book-render-line';

describe('BookRenderLineComponent', () => {
  let component: BookRenderLineComponent;
  let fixture: ComponentFixture<BookRenderLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookRenderLineComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(BookRenderLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
