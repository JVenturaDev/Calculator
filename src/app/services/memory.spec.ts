import { TestBed } from '@angular/core/testing';
import { MemoryService } from './memory';

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MemoryService);
    await service.initDB();
    await service.clear(); 
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debería guardar un registro en IndexedDB', async () => {
    const id = await service.saveRecord('2+2', 4);
    expect(id).toBeGreaterThan(0);
  });

  it('debería obtener todos los registros guardados', async () => {
    await service.saveRecord('3*3', 9);
    const data = await service.getAll();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].ecuacion).toBe('3*3');
  });

  it('debería eliminar un registro', async () => {
    const id = await service.saveRecord('5+5', 10);
    await service.delete(id);
    const data = await service.getAll();
    const found = data.find(d => d.id === id);
    expect(found).toBeUndefined();
  });

  it('debería limpiar toda la base de datos', async () => {
    await service.saveRecord('7*2', 14);
    await service.clear();
    const data = await service.getAll();
    expect(data.length).toBe(0);
  });

  it('debería recuperar el último registro guardado', async () => {
    await service.saveRecord('1+1', 2);
    const last = await service.getLastRecord();
    expect(last).toBeTruthy();
    expect(last?.resultado).toBe(2);
  });
});
