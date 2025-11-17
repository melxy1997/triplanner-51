import { Placeholder, createPlaceholder } from '@triplanner/core';

export interface RendererInitOptions {
  mount?: HTMLElement | null;
}

export class CanvasRenderer {
  private readonly marker: Placeholder;

  constructor(private readonly options: RendererInitOptions = {}) {
    this.marker = createPlaceholder('canvas renderer initialized');
  }

  describe(): string {
    const mountState = this.options.mount ? 'with mount' : 'headless';
    return `${this.marker.description} (${mountState})`;
  }
}

