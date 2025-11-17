import { TripDocument } from '../schema/document';
import { Selection } from '../schema/selection';
import { Viewport } from '../schema/viewport';
import { HistoryState, createEmptyHistoryState } from '../history/history';

/**
 * EditorState 描述了当前白板的完整状态
 * （文档 + 视口 + 选区 + 历史记录）。
 */
export interface EditorState {
  /** 文档实体 */
  doc: TripDocument;
  /** 当前视口参数 */
  viewport: Viewport;
  /** 当前选中状态 */
  selection: Selection;
  /** 撤销/重做历史栈 */
  history: HistoryState;
}

/**
 * 创建一个空的 TripDocument。
 */
export const createEmptyDocument = (): TripDocument => ({
  id: 'untitled',
  title: 'Untitled trip',
  blocks: new Map(),
  connectors: new Map(),
  timeline: new Map(),
});

/**
 * 创建默认初始状态，供应用在启动时使用。
 */
export const createEmptyEditorState = (): EditorState => ({
  doc: createEmptyDocument(),
  viewport: {
    center: { x: 0, y: 0 },
    zoom: 1,
  },
  selection: {
    selectedBlockIds: [],
    selectedConnectorIds: [],
  },
  history: createEmptyHistoryState(),
});

