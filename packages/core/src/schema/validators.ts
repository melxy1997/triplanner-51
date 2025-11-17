import {
  AttractionBlock,
  FlightBlock,
  HotelBlock,
  NoteBlock,
  TransportBlock,
  TripBlock,
} from './block';
import { Connector } from './connector';
import { TripDocument } from './document';

/**
 * 判断字符串是否是有效 ISO 时间。
 */
const isISODate = (value: string): boolean => !Number.isNaN(Date.parse(value));

/**
 * 校验时间范围是否合法。
 */
const ensureTimeRange = (start: string, end: string): string | null => {
  if (!isISODate(start) || !isISODate(end)) {
    return '时间必须是有效的 ISO 字符串';
  }
  if (new Date(start).getTime() >= new Date(end).getTime()) {
    return '开始时间必须早于结束时间';
  }
  return null;
};

/** 航班节点校验 */
const validateFlight = (block: FlightBlock): string | null => {
  if (!block.fromAirport || !block.toAirport) {
    return '航班必须包含出发和到达机场';
  }
  const timeError = ensureTimeRange(block.time.start, block.time.end);
  return timeError;
};

/** 酒店节点校验 */
const validateHotel = (block: HotelBlock): string | null => {
  if (!block.address) {
    return '酒店必须包含地址';
  }
  const timeError = ensureTimeRange(block.time.start, block.time.end);
  return timeError;
};

/** 景点节点校验 */
const validateAttraction = (block: AttractionBlock): string | null => {
  if (!block.title) {
    return '景点必须包含标题';
  }
  if (block.date && !isISODate(block.date)) {
    return '景点日期必须是有效时间';
  }
  return null;
};

/** 交通节点校验 */
const validateTransport = (block: TransportBlock): string | null => {
  if (!block.title) {
    return '交通节点必须包含标题';
  }
  if (block.time) {
    return ensureTimeRange(block.time.start, block.time.end);
  }
  return null;
};

/** 文本节点校验 */
const validateNote = (block: NoteBlock): string | null =>
  block.text ? null : '文本节点不能为空';

/**
 * 按节点类型执行合法性校验。
 */
export const validateBlock = (block: TripBlock): string | null => {
  if (block.layout.size.width <= 0 || block.layout.size.height <= 0) {
    return '节点尺寸必须大于0';
  }
  if (!Number.isFinite(block.layout.rotation)) {
    return '节点旋转值非法';
  }

  switch (block.kind) {
    case 'flight':
      return validateFlight(block);
    case 'hotel':
      return validateHotel(block);
    case 'attraction':
      return validateAttraction(block);
    case 'transport':
      return validateTransport(block);
    case 'note':
      return validateNote(block);
    case 'image':
    default:
      return null;
  }
};

export const validateConnector = (connector: Connector, doc: TripDocument): string | null => {
  if (connector.from === connector.to) {
    return '连接线不能自引用';
  }
  if (!doc.blocks.has(connector.from) || !doc.blocks.has(connector.to)) {
    return '连接线引用了不存在的节点';
  }
  return null;
};

