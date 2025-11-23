import { Shape, SceneState } from './types';

export class Scene {
    private state: SceneState;
    private listeners: Set<() => void>;

    constructor() {
        this.state = {
            shapes: {},
            selection: []
        };
        this.listeners = new Set();
    }

    getState(): SceneState {
        return this.state;
    }

    addShape(shape: Shape) {
        this.state.shapes[shape.id] = shape;
        this.notify();
    }

    updateShape(id: string, patch: Partial<Shape>) {
        const shape = this.state.shapes[id];
        if (shape) {
            this.state.shapes[id] = { ...shape, ...patch } as Shape;
            this.notify();
        }
    }

    removeShape(id: string) {
        delete this.state.shapes[id];
        this.notify();
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}
