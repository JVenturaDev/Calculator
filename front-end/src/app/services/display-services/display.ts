import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DisplayStateService {
  private valueSubject = new BehaviorSubject<string>(''); 
  value$ = this.valueSubject.asObservable(); 

  get currentValue(): string {
    return this.valueSubject.value;
  }

  setValue(val: string) {
    this.valueSubject.next(val);
  }

  appendValue(val: string) {
    this.valueSubject.next(this.valueSubject.value + val);
  }

  clear() {
    this.valueSubject.next('');
  }

  backspace() {
    this.valueSubject.next(this.valueSubject.value.slice(0, -1));
  }
}
