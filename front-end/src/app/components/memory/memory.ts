// src/app/components/memory/memory.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MemoryService, MemoryRecord } from '../../services/memory-services/memory';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { AppInitService } from '../../services/core-services/init-app';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';

@Component({
  selector: 'app-memory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory.html',
  styleUrls: ['./memory.css'],
})
export class MemoryComponent implements OnInit, OnDestroy {
  memoryList: MemoryRecord[] = [];
  isLoading = true;
  showMemory = true;
  private sub: Subscription | null = null;
  isVisible = true;

  constructor(
    private memoryService: MemoryService,
    private calculatorMemory: CalculatorMemoryService,
    private initApp: AppInitService,
    private toggleService: MemoryToggleService
  ) { }

  async ngOnInit() {
    await this.initApp.initApp();
    this.toggleService.visible$.subscribe(v => this.isVisible = v);
    await this.loadMemory();

    if (this.memoryService.changed$) {
      this.sub = this.memoryService.changed$.subscribe(() => {
        void this.loadMemory();
      });
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async loadMemory() {
    this.isLoading = true;
    try {
      this.memoryList = await this.memoryService.getAll();
    } catch (e) {
      console.error('Error cargando memoria:', e);
      this.memoryList = [];
    } finally {
      this.isLoading = false;
    }
  }

  async saveMemory() {
    try {
      const saved = await this.calculatorMemory.saveCurrent();
      if (saved) await this.loadMemory();
    } catch (e) {
      console.error('Error guardando en memoria:', e);
    }
  }

  async clearMemory() {
    try {
      await this.calculatorMemory.clearAll();
      this.memoryList = [];
    } catch (e) {
      console.error('Error limpiando memoria:', e);
    }
  }

  async deleteRecord(id?: number) {
    if (id == null) return;
    try {
      await this.calculatorMemory.delete(id);
    } catch (e) {
      console.error('Error eliminando registro:', e);
    }
  }

  async editRecord(id?: number) {
    if (id == null) return;
    try {
      await this.calculatorMemory.beginEdit(id);
    } catch (e) {
      console.error('Error editando registro:', e);
    }
  }

  async recallLast() {
    try {
      await this.calculatorMemory.recallLast();
    } catch (e) {
      console.error('Error recuperando último registro:', e);
    }
  }

  async memoryPlusFor(id?: number) {
    if (id == null) return;
    await this.calculatorMemory.addCurrentToRecord(id);
  }

  async memoryMinusFor(id?: number) {
    if (id == null) return;
    await this.calculatorMemory.subtractCurrentFromRecord(id);
  }

  async memoryPlus() {
    await this.calculatorMemory.addCurrentToLast();
  }

  async memoryMinus() {
    await this.calculatorMemory.subtractCurrentFromLast();
  }

  trackById(index: number, item: MemoryRecord) {
    return item.id;
  }
}
