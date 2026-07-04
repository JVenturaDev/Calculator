import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeNode, TreeNodeComponent } from './tree-render';

describe('TreeNodeComponent', () => {
  let component: TreeNodeComponent;
  let fixture: ComponentFixture<TreeNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeNodeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeNodeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a leaf node without a children group', () => {
    const element = renderTree({ label: '4', children: [] });
    const node = element.querySelector<HTMLElement>('.tree-node');

    expect(node?.querySelector('.node-label')?.textContent?.trim()).toBe('4');
    expect(node?.querySelector('.node-children')).toBeNull();
    expect(node?.getAttribute('role')).toBe('group');
  });

  it('renders every level of a multilevel tree', () => {
    const element = renderTree({
      label: '9',
      children: [
        {
          label: 'pow',
          children: [
            { label: '3', children: [] },
            { label: '2', children: [] },
          ],
        },
      ],
    });
    const labels = Array.from(element.querySelectorAll('.node-label'))
      .map(label => label.textContent?.trim());

    expect(labels).toEqual(['9', 'pow', '3', '2']);
    expect(element.querySelectorAll('.node-children').length).toBe(2);
  });

  it('renders several siblings as accessible list items', () => {
    const element = renderTree({
      label: '+',
      children: [
        { label: '2', children: [] },
        { label: '3', children: [] },
        { label: '5', children: [] },
      ],
    });
    const childrenGroup = element.querySelector<HTMLElement>('.node-children');
    const siblings = childrenGroup?.querySelectorAll(':scope > app-tree-node') ?? [];

    expect(childrenGroup?.getAttribute('role')).toBe('list');
    expect(siblings.length).toBe(3);
    siblings.forEach(sibling => expect(sibling.getAttribute('role')).toBe('listitem'));
  });

  it('provides accessible labels for nodes and child groups', () => {
    const element = renderTree({
      label: 'sin',
      children: [{ label: '0', children: [] }],
    });
    const root = element.querySelector<HTMLElement>('.tree-node');
    const childrenGroup = element.querySelector<HTMLElement>('.node-children');

    expect(root?.getAttribute('aria-label')).toBe('Nodo sin');
    expect(childrenGroup?.getAttribute('aria-label')).toBe('Nodos hijos de sin');
  });

  function renderTree(node: TreeNode): HTMLElement {
    component.node = node;
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }
});
