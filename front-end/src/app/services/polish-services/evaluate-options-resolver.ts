export type Variables = Record<string, number>;

export interface EvaluateOptions {
  variables?: Variables;
  steps?: boolean;
  normalize?: boolean;
  stackSnapshots?: boolean;
}

export type EvaluateInput = EvaluateOptions | Variables;

export interface ResolvedEvaluateOptions {
  variables: Variables;
  steps: boolean;
  normalize: boolean;
  stackSnapshots: boolean;
}

export class EvaluateOptionsResolver {
  resolve(input: EvaluateInput = {}): ResolvedEvaluateOptions {
    if (this.isEvaluateOptions(input)) {
      return {
        variables: input.variables ?? {},
        steps: input.steps ?? true,
        normalize: input.normalize ?? true,
        stackSnapshots: input.stackSnapshots ?? false,
      };
    }

    return {
      variables: input,
      steps: true,
      normalize: true,
      stackSnapshots: false,
    };
  }

  private isEvaluateOptions(input: unknown): input is EvaluateOptions {
    return (
      typeof input === 'object' &&
      input !== null &&
      (
        'variables' in input ||
        'steps' in input ||
        'normalize' in input ||
        'stackSnapshots' in input
      )
    );
  }
}
