// src/app/components/memory/memory.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MemoryService, MemoryRecord } from '../../services/memory-services/memory';
import { AppInitService } from '../../services/core-services/init-app';
import { StateService } from '../../services/core-services/state-object';
import { DisplayStateService } from '../../services/display-services/display';
import { CalculatorEngineService } from '../../services/engine-services/calculator-engine';
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
    private initApp: AppInitService,
    private stateService: StateService,
    private display: DisplayStateService,
    private engine: CalculatorEngineService,
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
    const valNum = Number(this.stateService.value.result);
    const expr = this.stateService.value.expression ?? String(valNum);

    if (isNaN(valNum)) return;

    try {
      if (this.stateService.value.idEnEdicion !== null) {
        if (this.memoryService.updateRecord) {
          await this.memoryService.updateRecord(
            this.stateService.value.idEnEdicion,
            expr,
            valNum
          );
        } else {
          await this.memoryService.delete(this.stateService.value.idEnEdicion);
          await this.memoryService.saveRecord(expr, valNum);
        }
        this.stateService.update({ idEnEdicion: null });
      } else {
        await this.memoryService.saveRecord(expr, valNum);
      }
      await this.loadMemory();
    } catch (e) {
      console.error('Error guardando en memoria:', e);
    }
  }

  async clearMemory() {
    try {
      await this.memoryService.clear();
      this.memoryList = [];
    } catch (e) {
      console.error('Error limpiando memoria:', e);
    }
  }

  async deleteRecord(id?: number) {
    if (id == null) return;
    try {
      await this.memoryService.delete(id);
    } catch (e) {
      console.error('Error eliminando registro:', e);
    }
  }

  async editRecord(id?: number) {
    if (id == null) return;
    try {
      const rec = this.memoryService.getRecord ? await this.memoryService.getRecord(id)
        : (await this.memoryService.getAll()).find(r => r.id === id);
      if (!rec) return;

      this.stateService.update({
        expression: rec.ecuacion,
        result: rec.resultado,
        idEnEdicion: rec.id ?? null,
      });

      this.display.setValue(String(rec.ecuacion));
    } catch (e) {
      console.error('Error editando registro:', e);
    }
  }

  async recallLast() {
    try {
      const last = await this.memoryService.getLastRecord();
      if (last) {
        this.stateService.update({ expression: last.ecuacion, result: last.resultado });
        this.display.setValue(last.resultado.toString());
      } else {
        alert('No hay registros en memoria.');
      }
    } catch (e) {
      console.error('Error recuperando último registro:', e);
    }
  }

  async memoryPlusFor(id?: number) {
    if (!id) return;
    const rec = await this.memoryService.getRecord(id);
    if (!rec) return;

    const inputExpr = this.stateService.value.expression ?? '';
    let add = 0;
    try {
      const res = this.engine.evalExpresion(inputExpr);
      add = typeof res === 'number' ? res : Number(res.toString());
    } catch {
      return;
    }

    const nuevo = Number(rec.resultado) + add;
    await this.memoryService.updateRecord(rec.id!, rec.ecuacion, nuevo);
  }

  async memoryMinusFor(id?: number) {
    if (!id) return;
    const rec = await this.memoryService.getRecord(id);
    if (!rec) return;

    const inputExpr = this.stateService.value.expression ?? '';
    let sub = 0;
    try {
      const res = this.engine.evalExpresion(inputExpr);
      sub = typeof res === 'number' ? res : Number(res.toString());
    } catch {
      return;
    }

    const nuevo = Number(rec.resultado) - sub;
    await this.memoryService.updateRecord(rec.id!, rec.ecuacion, nuevo);
  }

  trackById(index: number, item: MemoryRecord) {
    return item.id;
  }
}
