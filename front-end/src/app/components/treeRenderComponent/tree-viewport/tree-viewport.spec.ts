import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TreeNode } from '../tree-render/tree-render';
import { TreeViewportComponent } from './tree-viewport';

describe('TreeViewportComponent', () => {
  let component: TreeViewportComponent;
  let fixture: ComponentFixture<TreeViewportComponent>;
  let tree: TreeNode;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeViewportComponent],
    }).compileComponents();

    tree = {
      label: '+',
      children: [
        { label: '2', children: [] },
        { label: '3', children: [] },
      ],
    };
    fixture = TestBed.createComponent(TreeViewportComponent);
    component = fixture.componentInstance;
    component.node = tree;
    fixture.detectChanges();
  });

  it('starts at 100 percent', () => {
    expect(component.zoom).toBe(1);
    expect(component.zoomPercent).toBe(100);
    expect(percentage()).toBe('100%');
    expect(stage().style.transform).toBe('scale(1)');
  });

  it('zooms in and out in ten percent steps', () => {
    click('[aria-label="Acercar árbol"]');
    expect(component.zoomPercent).toBe(110);

    click('[aria-label="Alejar árbol"]');
    expect(component.zoomPercent).toBe(100);
  });

  it('keeps focus on zoom controls and stops clicks at the viewport boundary', () => {
    const zoomIn = button('[aria-label="Acercar árbol"]');
    const outsideClick = jasmine.createSpy('outsideClick');
    nativeElement().addEventListener('click', outsideClick);

    zoomIn.focus();
    zoomIn.click();
    fixture.detectChanges();

    expect(document.activeElement).toBe(zoomIn);
    expect(outsideClick).not.toHaveBeenCalled();
    expect(component.zoomPercent).toBe(110);
  });

  it('resets zoom to 100 percent', () => {
    component.zoomIn();
    fixture.detectChanges();

    click('[aria-label^="Restablecer zoom"]');

    expect(component.zoom).toBe(1);
    expect(percentage()).toBe('100%');
  });

  it('clamps zoom between 50 and 150 percent', () => {
    for (let index = 0; index < 20; index += 1) component.zoomOut();
    expect(component.zoom).toBe(0.5);
    expect(component.zoomPercent).toBe(50);

    for (let index = 0; index < 20; index += 1) component.zoomIn();
    expect(component.zoom).toBe(1.5);
    expect(component.zoomPercent).toBe(150);
  });

  it('disables zoom controls at their limits', () => {
    for (let index = 0; index < 5; index += 1) component.zoomOut();
    fixture.detectChanges();
    expect(button('[aria-label="Alejar árbol"]').disabled).toBeTrue();
    expect(button('[aria-label="Acercar árbol"]').disabled).toBeFalse();

    for (let index = 0; index < 10; index += 1) component.zoomIn();
    fixture.detectChanges();
    expect(button('[aria-label="Acercar árbol"]').disabled).toBeTrue();
    expect(button('[aria-label="Alejar árbol"]').disabled).toBeFalse();
  });

  it('renders one toolbar and one root tree without mutating its input', () => {
    const original = JSON.stringify(tree);
    const treeNode = fixture.debugElement.query(By.css('app-tree-node'));

    expect(nativeElement().querySelectorAll('[role="toolbar"]').length).toBe(1);
    expect(treeNode.componentInstance.node).toBe(tree);
    expect(JSON.stringify(tree)).toBe(original);
  });

  it('provides a focusable viewport with an accessible name', () => {
    const viewport = nativeElement().querySelector<HTMLElement>(
      '.tree-scroll-viewport'
    );

    expect(viewport?.getAttribute('role')).toBe('region');
    expect(viewport?.tabIndex).toBe(0);
    expect(viewport?.getAttribute('aria-label')).toContain('Árbol de pasos');
    expect(viewport?.getAttribute('aria-label')).toContain('100 por ciento');
  });

  it('keeps the technical canvas fixed and transforms only the tree stage', () => {
    const viewport = nativeElement().querySelector<HTMLElement>(
      '.tree-scroll-viewport'
    ) as HTMLElement;
    const rootTree = nativeElement().querySelector<HTMLElement>(
      '.tree-stage > app-tree-node'
    ) as HTMLElement;
    const transformedElements = Array.from(
      nativeElement().querySelectorAll<HTMLElement>('*')
    ).filter(element => element.style.transform);

    expect(getComputedStyle(viewport).backgroundImage).toContain('radial-gradient');
    expect(getComputedStyle(viewport).overflow).toBe('auto');
    expect(getComputedStyle(rootTree).backgroundImage).toBe('none');
    expect(transformedElements).toEqual([stage()]);
    expect(stage().style.transform).toBe('scale(1)');
  });

  function click(selector: string): void {
    button(selector).click();
    fixture.detectChanges();
  }

  function button(selector: string): HTMLButtonElement {
    const element = nativeElement().querySelector<HTMLButtonElement>(selector);
    expect(element).withContext(`Missing button ${selector}`).not.toBeNull();
    return element as HTMLButtonElement;
  }

  function percentage(): string {
    return nativeElement().querySelector('output')?.textContent?.trim() ?? '';
  }

  function stage(): HTMLElement {
    return nativeElement().querySelector('.tree-stage') as HTMLElement;
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
