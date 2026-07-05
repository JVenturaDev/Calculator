// src/app/components/memory/memory.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { skip, Subscription } from 'rxjs';
import { MemoryService, MemoryRecord } from '../../services/memory-services/memory';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { AppInitService } from '../../services/core-services/init-app';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToastService } from '../../services/toast-services/toast';

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
  private readonly subscriptions = new Subscription();
  isVisible = true;

  constructor(
    private memoryService: MemoryService,
    private calculatorMemory: CalculatorMemoryService,
    private initApp: AppInitService,
    private toggleService: MemoryToggleService,
    private toast: ToastService
  ) { }

  async ngOnInit() {
    await this.initApp.initApp();
    this.subscriptions.add(
      this.toggleService.visible$.subscribe(v => this.isVisible = v)
    );
    await this.loadMemory();

    this.subscriptions.add(
      this.memoryService.changed$.pipe(skip(1)).subscribe(() => {
        void this.loadMemory();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async loadMemory() {
    this.isLoading = true;
    try {
      this.memoryList = await this.memoryService.getAll();
    } catch (e) {
      this.reportMemoryError(
        'Error cargando memoria:',
        'No se pudieron cargar los registros de memoria.',
        e
      );
      this.memoryList = [];
    } finally {
      this.isLoading = false;
    }
  }

  async saveMemory() {
    try {
      await this.calculatorMemory.saveCurrent();
    } catch (e) {
      this.reportMemoryError(
        'Error guardando en memoria:',
        'No se pudo guardar el resultado en memoria.',
        e
      );
    }
  }

  async clearMemory() {
    try {
      await this.calculatorMemory.clearAll();
    } catch (e) {
      this.reportMemoryError(
        'Error limpiando memoria:',
        'No se pudo limpiar la memoria.',
        e
      );
    }
  }

  async deleteRecord(id?: number) {
    if (id == null) return;
    try {
      await this.calculatorMemory.delete(id);
    } catch (e) {
      this.reportMemoryError(
        'Error eliminando registro:',
        'No se pudo eliminar el registro de memoria.',
        e
      );
    }
  }

  async editRecord(id?: number) {
    if (id == null) return;
    try {
      await this.calculatorMemory.beginEdit(id);
    } catch (e) {
      this.reportMemoryError(
        'Error editando registro:',
        'No se pudo abrir el registro para editarlo.',
        e
      );
    }
  }

  async recallLast() {
    try {
      await this.calculatorMemory.recallLast();
    } catch (e) {
      this.reportMemoryError(
        'Error recuperando último registro:',
        'No se pudo recuperar el último registro de memoria.',
        e
      );
    }
  }

  async memoryPlusFor(id?: number) {
    if (id == null) return;
    try {
      await this.calculatorMemory.addCurrentToRecord(id);
    } catch (e) {
      this.reportMemoryError(
        'Error sumando al registro de memoria:',
        'No se pudo sumar el resultado al registro de memoria.',
        e
      );
    }
  }

  async memoryMinusFor(id?: number) {
    if (id == null) return;
    try {
      await this.calculatorMemory.subtractCurrentFromRecord(id);
    } catch (e) {
      this.reportMemoryError(
        'Error restando al registro de memoria:',
        'No se pudo restar el resultado del registro de memoria.',
        e
      );
    }
  }

  async memoryPlus() {
    try {
      await this.calculatorMemory.addCurrentToLast();
    } catch (e) {
      this.reportMemoryError(
        'Error sumando al último registro de memoria:',
        'No se pudo sumar el resultado al registro de memoria.',
        e
      );
    }
  }

  async memoryMinus() {
    try {
      await this.calculatorMemory.subtractCurrentFromLast();
    } catch (e) {
      this.reportMemoryError(
        'Error restando al último registro de memoria:',
        'No se pudo restar el resultado del registro de memoria.',
        e
      );
    }
  }

  trackById(_index: number, item: MemoryRecord) {
    return item.id;
  }

  private reportMemoryError(
    technicalMessage: string,
    userMessage: string,
    error: unknown
  ): void {
    console.error(technicalMessage, error);
    this.toast.error(userMessage, 8000);
  }
}
