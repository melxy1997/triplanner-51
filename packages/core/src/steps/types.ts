import { EditorState } from '../state/editorState';

/**
 * Step 执行后返回的结果。
 */
export interface StepApplyResult {
  /** 新的状态 */
  state: EditorState;
  /** 若失败则携带错误信息 */
  failed?: string;
}

/**
 * Step 是最小的可逆操作单元。
 */
export interface Step {
  /** Step 类型标识 */
  kind: string;
  /** 在给定状态上应用该 Step */
  apply(state: EditorState): StepApplyResult;
  /** 基于应用前的状态生成逆操作 */
  invert(before: EditorState): Step;
}

