import { EditorState } from '../state/editorState';
import { Step, StepApplyResult } from './types';
import { Viewport } from '../schema/viewport';
import { Selection } from '../schema/selection';

/**
 * 设置视口的 Step。
 */
export interface SetViewportStep extends Step {
  kind: 'setViewport';
  viewport: Partial<Viewport>;
}

/**
 * 构造设置视口的 Step。
 */
export const createSetViewportStep = (viewport: Partial<Viewport>): SetViewportStep => ({
  kind: 'setViewport',
  viewport,
  apply(state: EditorState): StepApplyResult {
    return {
      state: {
        ...state,
        viewport: {
          ...state.viewport,
          ...viewport,
        },
      },
    };
  },
  invert(before: EditorState): SetViewportStep {
    return createSetViewportStep(before.viewport);
  },
});

/**
 * 设置选中状态的 Step。
 */
export interface SetSelectionStep extends Step {
  kind: 'setSelection';
  selection: Selection | null;
}

/**
 * 构造设置选中状态的 Step。
 */
export const createSetSelectionStep = (selection: Selection | null): SetSelectionStep => ({
  kind: 'setSelection',
  selection,
  apply(state: EditorState): StepApplyResult {
    return {
      state: {
        ...state,
        selection: selection ?? { selectedBlockIds: [], selectedConnectorIds: [] },
      },
    };
  },
  invert(before: EditorState): SetSelectionStep {
    return createSetSelectionStep(
      before.selection.selectedBlockIds.length === 0 && before.selection.selectedConnectorIds.length === 0
        ? null
        : before.selection,
    );
  },
});

