import { Injectable } from '@angular/core';
import { WorkspaceItem, WorkspaceCalculation, CalculationDTO } from '../../components/work-space/work-space';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceApiService {
  private readonly baseUrl = 'http://localhost:8080/api/workspace';

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
    return this.http.delete<void>(`${this.baseUrl}/items/${id}`);
  }
}

