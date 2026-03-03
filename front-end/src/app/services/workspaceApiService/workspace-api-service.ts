import { Injectable } from '@angular/core';
import { WorkspaceItem, CalculationDTO } from '../../components/work-space/work-space';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceApiService {
  private readonly baseUrl = 'http://localhost:8080/api/workspace';
  private readonly baseUrll = 'http://localhost:8080/auth';
  private readonly tokenKey = 'auth_token';
  constructor(private http: HttpClient) { }

  getItems(): Observable<WorkspaceItem[]> {
    return this.http.get<WorkspaceItem[]>(`${this.baseUrl}/items`);
  }
  getItemById(id: string) {
    return this.http.get<WorkspaceItem>(`${this.baseUrl}/items/${id}`);
  }

  createItem(item: Partial<WorkspaceItem>) {
    return this.http.post<WorkspaceItem>(`${this.baseUrl}/items`, item);
  }

  updateExpression(id: string, expression: string) {
    return this.http.put<WorkspaceItem>(
      `${this.baseUrl}/items/${id}/expression`,
      { expression }
    );
  }
  addCalculationDTO(itemId: string, calc: CalculationDTO) {
    return this.http.post<CalculationDTO>(`${this.baseUrl}/items/${itemId}/calculations`, calc);
  }


  updateTags(itemId: string, tags: string[]) {
    return this.http.put<WorkspaceItem>(
      `${this.baseUrl}/items/${itemId}/tags`,
      tags
    );
  }

  deleteItem(id: string) {
    return this.http.delete(`${this.baseUrl}/items/${id}`, { observe: 'response' });
  }

  register(username: string, password: string) {
    return this.http.post(
      `${this.baseUrll}/register`,
      { username, password },
      { responseType: 'text' }
    );
  }

  login(username: string, password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseUrll}/login`, { username, password })
      .pipe(tap(res => this.setToken(res.token)));
  }
  guest(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseUrll}/guest`, {})
      .pipe(tap(res => this.setToken(res.token)));
  }
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    window.location.href = '/login';
  }
  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }
}

