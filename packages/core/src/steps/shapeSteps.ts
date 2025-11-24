import { Shape } from '../types';
import { EditorState } from '../state/editorState';
import { Step, StepApplyResult } from './types';

/**
 * Helper to update state with modified shapes Map
 */
const withUpdatedShapes = (
    state: EditorState,
    updater: (shapes: Map<string, Shape>) => Map<string, Shape>,
): StepApplyResult => ({
    state: {
        ...state,
        shapes: updater(state.shapes),
    },
});

/** Add Shape Step */
export interface AddShapeStep extends Step {
    kind: 'addShape';
    shape: Shape;
}

/**
 * Create a Step to add a shape to the canvas.
 */
export const createAddShapeStep = (shape: Shape): AddShapeStep => ({
    kind: 'addShape',
    shape,
    apply(state) {
        if (state.shapes.has(shape.id)) {
            return { state, failed: 'Shape already exists' };
        }
        return withUpdatedShapes(state, (shapes) => {
            const newShapes = new Map(shapes);
            newShapes.set(shape.id, shape);
            return newShapes;
        });
    },
    invert(before) {
        return createRemoveShapeStep(shape.id);
    },
});

/** Remove Shape Step */
export interface RemoveShapeStep extends Step {
    kind: 'removeShape';
    shapeId: string;
}

/**
 * Create a Step to remove a shape from the canvas.
 */
export const createRemoveShapeStep = (shapeId: string): RemoveShapeStep => ({
    kind: 'removeShape',
    shapeId,
    apply(state) {
        if (!state.shapes.has(shapeId)) {
            return { state, failed: 'Shape not found' };
        }
        return withUpdatedShapes(state, (shapes) => {
            const newShapes = new Map(shapes);
            newShapes.delete(shapeId);
            return newShapes;
        });
    },
    invert(before) {
        const shape = before.shapes.get(shapeId);
        if (!shape) {
            throw new Error('Cannot invert remove shape without original shape');
        }
        return createAddShapeStep(shape);
    },
});

/** Update Shape Step */
export interface UpdateShapeStep extends Step {
    kind: 'updateShape';
    shapeId: string;
    patch: Partial<Shape>;
}

/**
 * Create a Step to update a shape's properties.
 */
export const createUpdateShapeStep = (
    shapeId: string,
    patch: Partial<Shape>,
): UpdateShapeStep => ({
    kind: 'updateShape',
    shapeId,
    patch,
    apply(state) {
        const shape = state.shapes.get(shapeId);
        if (!shape) {
            return { state, failed: 'Shape not found' };
        }
        const updated = { ...shape, ...patch } as Shape;
        return withUpdatedShapes(state, (shapes) => {
            const newShapes = new Map(shapes);
            newShapes.set(shapeId, updated);
            return newShapes;
        });
    },
    invert(before) {
        const shape = before.shapes.get(shapeId);
        if (!shape) {
            throw new Error('Cannot invert shape update without original shape');
        }
        // Invert by restoring original properties
        const invertPatch: Partial<Shape> = {};
        for (const key of Object.keys(patch)) {
            (invertPatch as any)[key] = (shape as any)[key];
        }
        return createUpdateShapeStep(shapeId, invertPatch);
    },
});
