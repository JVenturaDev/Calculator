declare module 'plotly.js-gl3d-dist-min' {
  export interface Plotly3DModule {
    newPlot: (...args: unknown[]) => Promise<unknown>;
    react: (...args: unknown[]) => Promise<unknown>;
    purge: (...args: unknown[]) => void;
    Plots: {
      resize: (...args: unknown[]) => Promise<unknown>;
    };
  }

  const Plotly3D: Plotly3DModule;
  export default Plotly3D;
}
