import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ToggleService } from '../../../services/toggle-services/toggle';
import { Main } from './main';

const destroyedKeyboards: string[] = [];

@Component({
  selector: 'app-calculator-basic',
  standalone: true,
  template: '<div class="basic-stub"></div>',
})
class BasicKeyboardStub implements OnDestroy {
  ngOnDestroy(): void {
    destroyedKeyboards.push('basic');
  }
}

@Component({
  selector: 'app-calculator-scientific',
  standalone: true,
  template: '<div class="scientific-stub"></div>',
})
class ScientificKeyboardStub implements OnDestroy {
  ngOnDestroy(): void {
    destroyedKeyboards.push('scientific');
  }
}

@Component({
  selector: 'app-graphic',
  standalone: true,
  template: '<div class="graphic-stub"></div>',
})
class GraphicKeyboardStub implements OnDestroy {
  ngOnDestroy(): void {
    destroyedKeyboards.push('graphic');
  }
}

@Component({ selector: 'app-top-bar', standalone: true, template: '' })
class TopBarStub {}

@Component({ selector: 'app-sidebar', standalone: true, template: '' })
class SidebarStub {}

@Component({ selector: 'app-display', standalone: true, template: '' })
class DisplayStub {}

@Component({
  selector: 'app-work-space',
  standalone: true,
  template: '',
})
class WorkspaceStub {
  activeItemId = 'workspace-1';
  calculations = ['2+2=4'];
}

@Component({
  selector: 'app-inspector-shell',
  standalone: true,
  template: '',
})
class InspectorStub {
  memoryOpen = true;
}

describe('Main', () => {
  let component: Main;
  let fixture: ComponentFixture<Main>;
  let toggleService: ToggleService;

  beforeEach(async () => {
    destroyedKeyboards.length = 0;

    await TestBed.configureTestingModule({
      imports: [Main],
      providers: [
        ToggleService,
      ],
    })
      .overrideComponent(Main, {
        set: {
          imports: [
            CommonModule,
            BasicKeyboardStub,
            ScientificKeyboardStub,
            GraphicKeyboardStub,
            TopBarStub,
            SidebarStub,
            DisplayStub,
            WorkspaceStub,
            InspectorStub,
          ],
        },
      })
      .compileComponents();

    toggleService = TestBed.inject(ToggleService);
    fixture = TestBed.createComponent(Main);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders exactly one keyboard for the active mode', () => {
    expect(renderedKeyboardHosts()).toEqual(['app-graphic']);

    activate('basic');
    expect(renderedKeyboardHosts()).toEqual(['app-calculator-basic']);

    activate('scientific');
    expect(renderedKeyboardHosts()).toEqual(['app-calculator-scientific']);

    activate('graphic');
    expect(renderedKeyboardHosts()).toEqual(['app-graphic']);
  });

  it('destroys the previous keyboard when changing modes', () => {
    activate('basic');
    destroyedKeyboards.length = 0;

    activate('scientific');
    activate('graphic');

    expect(destroyedKeyboards).toEqual(['basic', 'scientific']);
  });

  it('keeps Memory and Workspace mounted with their state while changing mode', () => {
    const workspace = fixture.debugElement.query(By.directive(WorkspaceStub))
      .componentInstance as WorkspaceStub;
    const inspector = fixture.debugElement.query(By.directive(InspectorStub))
      .componentInstance as InspectorStub;

    workspace.activeItemId = 'workspace-2';
    workspace.calculations.push('3+3=6');
    inspector.memoryOpen = true;

    activate('basic');
    activate('scientific');
    activate('graphic');

    const currentWorkspace = fixture.debugElement.query(By.directive(WorkspaceStub))
      .componentInstance as WorkspaceStub;
    const currentInspector = fixture.debugElement.query(By.directive(InspectorStub))
      .componentInstance as InspectorStub;

    expect(currentWorkspace).toBe(workspace);
    expect(currentWorkspace.activeItemId).toBe('workspace-2');
    expect(currentWorkspace.calculations).toEqual(['2+2=4', '3+3=6']);
    expect(currentInspector).toBe(inspector);
    expect(currentInspector.memoryOpen).toBeTrue();
  });

  function activate(mode: 'basic' | 'scientific' | 'graphic'): void {
    toggleService.setActiveCalc(mode);
    fixture.detectChanges();
  }

  function renderedKeyboardHosts(): string[] {
    return [
      'app-calculator-basic',
      'app-calculator-scientific',
      'app-graphic',
    ].filter(selector => fixture.nativeElement.querySelector(selector));
  }
});
