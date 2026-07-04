import { ComponentFixture, TestBed } from '@angular/core/testing';

import { parser } from '../../../services/polish-services/polish-notation-parser-service';
import { WorkspaceApiService } from '../../../services/workspaceApiService/workspace-api-service';
import { Main } from './main';

describe('Main', () => {
  let component: Main;
  let fixture: ComponentFixture<Main>;
  let parserService: jasmine.SpyObj<parser>;

  beforeEach(async () => {
    parserService = jasmine.createSpyObj<parser>('parser', ['testPostfix']);

    await TestBed.configureTestingModule({
      imports: [Main],
      providers: [
        { provide: parser, useValue: parserService },
        { provide: WorkspaceApiService, useValue: {} },
      ],
    })
      .overrideComponent(Main, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(Main);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and preserve the existing initialization', () => {
    expect(component).toBeTruthy();
    expect(parserService.testPostfix).toHaveBeenCalledOnceWith('sin(asinh(9))');
  });
});
