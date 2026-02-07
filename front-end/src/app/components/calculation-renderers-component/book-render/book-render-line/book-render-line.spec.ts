import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookRenderLine } from './book-render-line';

describe('BookRenderLine', () => {
  let component: BookRenderLine;
  let fixture: ComponentFixture<BookRenderLine>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookRenderLine]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookRenderLine);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
