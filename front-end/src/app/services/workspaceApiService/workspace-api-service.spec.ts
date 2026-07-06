import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { WorkspaceApiService } from './workspace-api-service';

describe('WorkspaceApiService', () => {
  let service: WorkspaceApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(WorkspaceApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('auth_token');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('uses the relative Workspace items endpoint', () => {
    service.getItems().subscribe();

    const request = httpTesting.expectOne('/api/workspace/items');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('uses the relative login endpoint', () => {
    service.login('user', 'secret').subscribe();

    const request = httpTesting.expectOne('/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      username: 'user',
      password: 'secret',
    });
    request.flush({ token: 'token' });
  });

  it('uses the relative register endpoint', () => {
    service.register('user', 'secret').subscribe();

    const request = httpTesting.expectOne('/auth/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.responseType).toBe('text');
    request.flush('registered');
  });

  it('uses the relative guest endpoint', () => {
    service.guest().subscribe();

    const request = httpTesting.expectOne('/auth/guest');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ token: 'guest-token' });
  });
});
