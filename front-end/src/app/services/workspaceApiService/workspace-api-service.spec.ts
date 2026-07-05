import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { WorkspaceApiService } from './workspace-api-service';

describe('WorkspaceApiService', () => {
  let service: WorkspaceApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(WorkspaceApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
