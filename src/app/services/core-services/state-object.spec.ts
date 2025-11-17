import { TestBed } from '@angular/core/testing';
import { StateService } from './state-object';

describe('StateService', () => {
  let stateobject: StateService; 

  beforeEach(() => {
    TestBed.configureTestingModule({});
    stateobject = TestBed.inject(StateService);
  });

  it('should be created', () => {
    expect(stateobject).toBeTruthy();
  });

  it('should update state correctly', () => {
    stateobject.update({ result: 42 });
    expect(stateobject.value.result).toBe(42);
  });
});
