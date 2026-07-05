import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToggleService, CalcType } from '../../services/toggle-services/toggle';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @ViewChildren('modeButton')
  private modeButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  isVisible = false;
  activeCalc: CalcType = 'graphic';
  private readonly subscriptions = new Subscription();
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(private toggleService: ToggleService) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.toggleService.getToggle('sidebar').subscribe(visible => {
        if (visible === this.isVisible) return;

        if (visible) {
          this.previouslyFocusedElement =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          this.isVisible = true;
          this.scheduleFocus(() => this.focusActiveMode());
          return;
        }

        this.isVisible = false;
        const focusTarget = this.previouslyFocusedElement;
        this.previouslyFocusedElement = null;
        this.scheduleFocus(() => focusTarget?.focus());
      })
    );
    this.subscriptions.add(
      this.toggleService.activeCalc$.subscribe(calc => this.activeCalc = calc)
    );
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.focusTimer !== null) clearTimeout(this.focusTimer);
    this.subscriptions.unsubscribe();
  }

  select(calc: CalcType): void {
    this.toggleService.setActiveCalc(calc);
  }

  closeSidebar(): void {
    if (this.isVisible) this.toggleService.hide('sidebar');
  }

  onSidebarKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const buttons = this.modeButtons.toArray().map(({ nativeElement }) => nativeElement);
    if (!buttons.length) return;

    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.isVisible) return;

    event.preventDefault();
    this.closeSidebar();
  }

  private focusActiveMode(): void {
    const buttons = this.modeButtons?.toArray() ?? [];
    const activeButton = buttons.find(
      ({ nativeElement }) => nativeElement.dataset['mode'] === this.activeCalc
    );

    (activeButton ?? buttons[0])?.nativeElement.focus();
  }

  private scheduleFocus(action: () => void): void {
    if (this.focusTimer !== null) clearTimeout(this.focusTimer);

    this.focusTimer = setTimeout(() => {
      this.focusTimer = null;
      if (!this.destroyed) action();
    });
  }
}
