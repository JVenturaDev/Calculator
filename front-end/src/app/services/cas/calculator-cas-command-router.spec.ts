import { TestBed } from '@angular/core/testing';
import { CalculatorCasCommandRouterService } from './calculator-cas-command-router';

describe('CalculatorCasCommandRouterService', () => {
  let router: CalculatorCasCommandRouterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CalculatorCasCommandRouterService],
    });
    router = TestBed.inject(CalculatorCasCommandRouterService);
  });

  it('does not handle ordinary numeric functions', () => {
    expect(router.canHandle('sin(1)')).toBeFalse();
    expect(router.execute('sin(1)')).toBeNull();
  });

  it('simplifies expressions through the public CAS engine', () => {
    const execution = router.execute('simplify(2*x + 3*x)');

    expect(execution).not.toBeNull();
    expect(execution?.ok).toBeTrue();
    if (execution?.ok) {
      expect(execution.command).toBe('simplify');
      expect(execution.result.kind).toBe('symbolic');
      expect(execution.result.display).toBe('5 * x');
      expect(execution.result.latex).toBe('5 * x');
    }
  });

  it('expands expressions through the public CAS engine', () => {
    const execution = router.execute('expand((x + 1)^2)');

    expect(execution).not.toBeNull();
    expect(execution?.ok).toBeTrue();
    if (execution?.ok) {
      expect(execution.command).toBe('expand');
      expect(execution.result.kind).toBe('symbolic');
      expect(execution.result.display).toContain('x ^ 2');
    }
  });

  it('factors expressions through the public CAS engine', () => {
    const execution = router.execute('factor(x^2 - 1)');

    expect(execution).not.toBeNull();
    expect(execution?.ok).toBeTrue();
    if (execution?.ok) {
      expect(execution.command).toBe('factor');
      expect(execution.result.kind).toBe('symbolic');
      expect(execution.result.display).toContain('(x - 1)');
      expect(execution.result.display).toContain('(x + 1)');
    }
  });

  it('supports diff as an alias for differentiate', () => {
    const execution = router.execute('diff(sin(x), x)');

    expect(execution).not.toBeNull();
    expect(execution?.ok).toBeTrue();
    if (execution?.ok) {
      expect(execution.command).toBe('differentiate');
      expect(execution.result.kind).toBe('symbolic');
      expect(execution.result.display).toContain('cos(x)');
    }
  });

  it('supports differentiate as the canonical command name', () => {
    const execution = router.execute('differentiate(sin(x), x)');

    expect(execution).not.toBeNull();
    expect(execution?.ok).toBeTrue();
    if (execution?.ok) {
      expect(execution.command).toBe('differentiate');
      expect(execution.result.kind).toBe('symbolic');
      expect(execution.result.display).toContain('cos(x)');
    }
  });

  it('reports arity errors before validating variables', () => {
    for (const source of [
      'diff(x)',
      'diff(x, )',
      'diff(, x)',
      'diff(x, x, y)',
      'differentiate()',
      'differentiate(x)',
      'solve(x = 1)',
      'solve(x = 1, )',
      'simplify()',
    ]) {
      const execution = router.execute(source);

      expect(execution).not.toBeNull();
      expect(execution?.ok).toBeFalse();
      if (execution && !execution.ok) {
        expect(execution.error.code).toBe('CAS_COMMAND_ARITY_ERROR');
      }
    }
  });

  it('solves simple equations and formats multiple solutions', () => {
    const execution = router.execute('solve(x^2 - 1 = 0, x)');

    expect(execution).not.toBeNull();
    expect(execution?.ok).toBeTrue();
    if (execution?.ok) {
      expect(execution.command).toBe('solve');
      expect(execution.result.kind).toBe('equation-solutions');
      expect(execution.result.display).toContain('x = -1');
      expect(execution.result.display).toContain('x = 1');
      expect(execution.result.solutionKind).toBe('finite');
    }
  });

  it('reports unsupported command-like identifiers clearly', () => {
    const execution = router.execute('unknown(x)');

    expect(execution).not.toBeNull();
    expect(execution?.ok).toBeFalse();
    if (execution && !execution.ok) {
      expect(execution.error.code).toBe('CAS_COMMAND_UNSUPPORTED');
    }
  });

  it('reports arity errors for malformed commands', () => {
    const execution = router.execute('diff(x)');

    expect(execution).not.toBeNull();
    expect(execution?.ok).toBeFalse();
    if (execution && !execution.ok) {
      expect(execution.error.code).toBe('CAS_COMMAND_ARITY_ERROR');
    }
  });

  it('rejects malformed solve and simplify commands without throwing', () => {
    for (const source of ['solve(x = 1)', 'solve(x = 1, )', 'simplify()']) {
      const execution = router.execute(source);

      expect(execution).not.toBeNull();
      expect(execution?.ok).toBeFalse();
      if (execution && !execution.ok) {
        expect(execution.error.code).toBe('CAS_COMMAND_ARITY_ERROR');
      }
    }
  });
});
