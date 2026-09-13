import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { formatCasTextAsLatex } from '../../services/cas/format/cas-latex-formatter';

type KatexModule = typeof import('katex');

let katexModulePromise: Promise<KatexModule> | null = null;

@Component({
  selector: 'app-cas-math-result',
  standalone: true,
  templateUrl: './cas-math-result.html',
  styleUrl: './cas-math-result.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CasMathResultComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) text = '';
  @ViewChild('mathHost') private mathHost?: ElementRef<HTMLElement>;

  rendered = false;
  latex: string | null = null;

  private viewReady = false;
  private renderVersion = 0;
  private destroyed = false;

  constructor(private changeDetector: ChangeDetectorRef) {}

  ngOnChanges(): void {
    if (this.viewReady) void this.render();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.render();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.renderVersion += 1;
  }

  private async render(): Promise<void> {
    const version = ++this.renderVersion;
    const host = this.mathHost?.nativeElement;
    const latex = formatCasTextAsLatex(this.text);

    this.latex = latex;
    this.rendered = false;
    host?.replaceChildren();

    if (!host || !latex) {
      this.changeDetector.markForCheck();
      return;
    }

    try {
      const katex = await loadKatex();
      if (this.destroyed || version !== this.renderVersion) return;

      katex.render(latex, host, {
        displayMode: true,
        output: 'mathml',
        strict: 'error',
        throwOnError: true,
        trust: false,
      });
      this.rendered = true;
    } catch {
      host.replaceChildren();
      this.rendered = false;
    }

    this.changeDetector.markForCheck();
  }
}

function loadKatex(): Promise<KatexModule> {
  katexModulePromise ??= import('katex');
  return katexModulePromise;
}
