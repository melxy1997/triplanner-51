import { createPlaceholder } from '@triplanner/core';
export class CanvasRenderer {
    constructor(options = {}) {
        this.options = options;
        this.marker = createPlaceholder('canvas renderer initialized');
    }
    describe() {
        const mountState = this.options.mount ? 'with mount' : 'headless';
        return `${this.marker.description} (${mountState})`;
    }
}
//# sourceMappingURL=index.js.map