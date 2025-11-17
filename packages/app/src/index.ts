import { createPlaceholder } from '@triplanner/core';
import { CanvasRenderer } from '@triplanner/renderer-canvas';

export const bootstrapApp = (): string => {
  const marker = createPlaceholder('Triplanner app bootstrap');
  const renderer = new CanvasRenderer();
  return `${marker.description} + ${renderer.describe()}`;
};

