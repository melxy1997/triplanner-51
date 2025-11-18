import {
  BlockLayout,
  FlightBlock,
  NoteBlock,
  TripBlock,
  TripBlockKind,
} from '../schema/block.js';
import { TimeRange, Vec2 } from '../schema/types.js';
import { validateBlock } from '../schema/validators.js';
import { generateId } from '../utils/id.js';

/** 内部统一的时间戳生成函数 */
const now = () => Date.now();

/**
 * 构造节点默认布局。
 */
export const createDefaultLayout = (position: Vec2 = { x: 0, y: 0 }): BlockLayout => ({
  position,
  size: { width: 200, height: 120 },
  rotation: 0,
  zIndex: 0,
  locked: false,
});

/**
 * 验证并返回节点，若非法直接抛出错误。
 */
const withMeta = <T extends TripBlock>(block: T): T => {
  const error = validateBlock(block);
  if (error) {
    throw new Error(error);
  }
  return block;
};

/**
 * 创建航班节点所需的输入。
 */
export interface CreateFlightBlockInput {
  /** 显示标题 */
  title: string;
  /** 起飞机场 */
  fromAirport: string;
  /** 落地机场 */
  toAirport: string;
  /** 时间范围 */
  time: TimeRange;
  /** 默认位置 */
  position?: Vec2;
  /** 航司 */
  carrier?: string;
  /** 航班号 */
  flightNumber?: string;
  /** 来源外部 ID */
  sourceExternalId?: string;
}

/**
 * 根据输入创建一个合法的航班节点。
 */
export const createFlightBlock = (input: CreateFlightBlockInput): FlightBlock =>
  withMeta<FlightBlock>({
    id: generateId('block'),
    kind: 'flight',
    layout: createDefaultLayout(input.position),
    createdAt: now(),
    updatedAt: now(),
    source: input.sourceExternalId
      ? {
          provider: 'trip.com',
          externalId: input.sourceExternalId,
        }
      : undefined,
    title: input.title,
    fromAirport: input.fromAirport,
    toAirport: input.toAirport,
    time: input.time,
    carrier: input.carrier,
    flightNumber: input.flightNumber,
  });

/**
 * 创建一条文本备注节点。
 */
export const createNoteBlock = (text: string, position?: Vec2): TripBlock =>
  withMeta<NoteBlock>({
    id: generateId('block'),
    kind: 'note',
    layout: createDefaultLayout(position),
    createdAt: now(),
    updatedAt: now(),
    text,
  });

/**
 * 返回一个更新了布局信息的新节点。
 */
export const cloneBlockWithLayout = (
  block: TripBlock,
  patch: Partial<BlockLayout>,
): TripBlock => ({
  ...block,
  layout: {
    ...block.layout,
    ...patch,
    position: patch.position ?? block.layout.position,
    size: patch.size ?? block.layout.size,
  },
  updatedAt: now(),
});

/**
 * 断言节点类型，若不匹配则抛错，通常用于命令层。
 */
export const ensureBlockKind = <K extends TripBlockKind>(
  block: TripBlock,
  kind: K,
): Extract<TripBlock, { kind: K }> => {
  if (block.kind !== kind) {
    throw new Error(`Block ${block.id} is not of kind ${kind}`);
  }
  return block as Extract<TripBlock, { kind: K }>;
};

