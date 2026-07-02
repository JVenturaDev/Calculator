import { EvaluateOptionsResolver } from './evaluate-options-resolver';

describe('EvaluateOptionsResolver', () => {
  const resolver = new EvaluateOptionsResolver();

  it('keeps the v2 defaults without enabling stack snapshots', () => {
    expect(resolver.resolve()).toEqual({
      variables: {},
      steps: true,
      normalize: true,
      stackSnapshots: false,
    });
  });

  it('resolves raw evaluation options for the Calculator adapter', () => {
    expect(resolver.resolve({
      variables: { x: 2 },
      steps: false,
      normalize: false,
      stackSnapshots: false,
    })).toEqual({
      variables: { x: 2 },
      steps: false,
      normalize: false,
      stackSnapshots: false,
    });
  });
});
