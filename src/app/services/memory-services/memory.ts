import { Injectable, NgZone } from '@angular/core';
import Complex from 'complex.js';
import { BehaviorSubject } from 'rxjs';

export interface MemoryRecord {
  id?: number;
  ecuacion: string;
  resultado: number;
  resultadoOriginal?: number;
}

@Injectable({ providedIn: 'root' })
export class MemoryService {
  private db: IDBDatabase | null = null;

  private _changed = new BehaviorSubject<void>(undefined);
  readonly changed$ = this._changed.asObservable();

  constructor(private ngZone: NgZone) {}

  private emitChange() {
    this.ngZone.run(() => this._changed.next());
  }

  initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('Resultado-y-operaciones', 1);

      request.onerror = (event) => reject(event);
      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('numero')) {
          const store = db.createObjectStore('numero', { keyPath: 'id', autoIncrement: true });
          store.createIndex('ecuacion', 'ecuacion', { unique: false });
          store.createIndex('resultado', 'resultado', { unique: false });
        }
      };
    });
  }

  async saveRecord(ecuacion: string, resultado: number | Complex): Promise<number | Complex> {
    if (!this.db) throw new Error('DB no inicializada');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['numero'], 'readwrite');
      const store = tx.objectStore('numero');
      const request = store.add({ ecuacion, resultado });

      request.onsuccess = () => {
        this.emitChange();
        resolve(request.result as number);
      };
      request.onerror = (e) => reject(e);
    });
  }

  async updateRecord(id: number, ecuacion: string, resultado: number): Promise<void> {
    if (!this.db) throw new Error('DB no inicializada');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['numero'], 'readwrite');
      const store = tx.objectStore('numero');
      const request = store.put({ id, ecuacion, resultado });

      request.onsuccess = () => {
        this.emitChange();
        resolve();
      };
      request.onerror = (e) => reject(e);
    });
  }

  async getAll(): Promise<MemoryRecord[]> {
    if (!this.db) throw new Error('DB no inicializada');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['numero'], 'readonly');
      const store = tx.objectStore('numero');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as MemoryRecord[]);
      request.onerror = (e) => reject(e);
    });
  }

  async getRecord(id: number): Promise<MemoryRecord | null> {
    if (!this.db) throw new Error('DB no inicializada');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['numero'], 'readonly');
      const store = tx.objectStore('numero');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result ? (request.result as MemoryRecord) : null);
      request.onerror = (e) => reject(e);
    });
  }

  async delete(id: number): Promise<void> {
    if (!this.db) throw new Error('DB no inicializada');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['numero'], 'readwrite');
      const store = tx.objectStore('numero');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.emitChange();
        resolve();
      };
      request.onerror = (e) => reject(e);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('DB no inicializada');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['numero'], 'readwrite');
      const store = tx.objectStore('numero');
      const request = store.clear();

      request.onsuccess = () => {
        this.emitChange();
        resolve();
      };
      request.onerror = (e) => reject(e);
    });
  }

  async getLastRecord(): Promise<MemoryRecord | null> {
    if (!this.db) throw new Error('DB no inicializada');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['numero'], 'readonly');
      const store = tx.objectStore('numero');
      const cursorRequest = store.openCursor(null, 'prev');

      cursorRequest.onsuccess = (event: any) => {
        const cursor = event.target.result;
        resolve(cursor ? (cursor.value as MemoryRecord) : null);
      };
      cursorRequest.onerror = (e) => reject(e);
    });
  }
}
