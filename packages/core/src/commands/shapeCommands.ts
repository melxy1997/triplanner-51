import { EditorState } from '../state/editorState';
import { Transaction, applyTransaction, TransactionSource } from '../transaction/transaction';
import { createAddShapeStep, createUpdateShapeStep, createRemoveShapeStep } from '../steps/shapeSteps';
import { Shape } from '../types';
import { pushToHistory } from '../history/history';

const pushHistoryIfNeeded = (
    state: EditorState,
    tr: Transaction,
    res: ReturnType<typeof applyTransaction>,
): EditorState => {
    if (res.failed) {
        throw new Error(res.failed);
    }
    if (res.inverse && tr.meta.addToHistory) {
        return {
            ...res.state,
            history: pushToHistory(res.state.history, { transaction: tr, inverse: res.inverse }),
        };
    }
    return res.state;
};

/**
 * Shape command options (re-export from blockCommands for convenience)
 */
export interface ShapeCommandOptions {
    addToHistory?: boolean;
    source?: TransactionSource;
    label?: string;
    groupId?: string;
}

/**
 * Add a shape to the canvas.
 */
export function addShape(state: EditorState, shape: Shape, options: ShapeCommandOptions = {}): EditorState {
    const step = createAddShapeStep(shape);
    const tr: Transaction = {
        steps: [step],
        meta: {
            addToHistory: options.addToHistory ?? true,
            source: options.source ?? 'local',
            label: options.label ?? 'add-shape',
            timestamp: Date.now(),
            groupId: options.groupId,
        },
    };
    const res = applyTransaction(state, tr);
    return pushHistoryIfNeeded(state, tr, res);
}

/**
 * Update a shape's properties.
 */
export function updateShape(
    state: EditorState,
    shapeId: string,
    patch: Partial<Shape>,
    options: ShapeCommandOptions = {},
): EditorState {
    const step = createUpdateShapeStep(shapeId, patch);
    const tr: Transaction = {
        steps: [step],
        meta: {
            addToHistory: options.addToHistory ?? true,
            source: options.source ?? 'local',
            label: options.label ?? 'update-shape',
            timestamp: Date.now(),
            groupId: options.groupId,
        },
    };
    const res = applyTransaction(state, tr);
    return pushHistoryIfNeeded(state, tr, res);
}

/**
 * Remove a shape from the canvas.
 */
export function removeShape(state: EditorState, shapeId: string, options: ShapeCommandOptions = {}): EditorState {
    const step = createRemoveShapeStep(shapeId);
    const tr: Transaction = {
        steps: [step],
        meta: {
            addToHistory: options.addToHistory ?? true,
            source: options.source ?? 'local',
            label: options.label ?? 'remove-shape',
            timestamp: Date.now(),
            groupId: options.groupId,
        },
    };
    const res = applyTransaction(state, tr);
    return pushHistoryIfNeeded(state, tr, res);
}
