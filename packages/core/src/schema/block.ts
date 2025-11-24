import { Size, TimeRange, Vec2 } from './types';

/**
 * 节点类型枚举，描述白板中出现的业务实体。
 */
export type TripBlockKind =
  | 'flight'
  | 'hotel'
  | 'attraction'
  | 'transport'
  | 'note'
  | 'image';

/** 白板节点唯一标识 */
export type BlockId = string;

/**
 * 白板节点在画布上的布局信息。
 */
export interface BlockLayout {
  /** 白板世界坐标中的位置 */
  position: Vec2;
  /** 节点尺寸 */
  size: Size;
  /** 旋转角度（单位：度） */
  rotation: number;
  /** 渲染图层排序值 */
  zIndex: number;
  /** 是否锁定以禁止编辑 */
  locked: boolean;
}

/**
 * 所有节点共享的基础字段。
 */
export interface BaseTripBlock {
  /** 节点唯一标识 */
  id: BlockId;
  /** 节点类型 */
  kind: TripBlockKind;
  /** 布局信息 */
  layout: BlockLayout;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 最近更新时间戳（毫秒） */
  updatedAt: number;
  /** 来源信息（接入 Trip.com 数据时使用） */
  source?: {
    /** 数据提供方 */
    provider: 'trip.com';
    /** 三方原始 ID */
    externalId: string;
    /** 可选跳转链接 */
    url?: string;
  };
}

/** 航班节点 */
export interface FlightBlock extends BaseTripBlock {
  kind: 'flight';
  /** 展示标题 */
  title: string;
  /** 出发机场 */
  fromAirport: string;
  /** 到达机场 */
  toAirport: string;
  /** 承运航司 */
  carrier?: string;
  /** 航班号 */
  flightNumber?: string;
  /** 起飞/落地时间 */
  time: TimeRange;
}

/** 酒店节点 */
export interface HotelBlock extends BaseTripBlock {
  kind: 'hotel';
  /** 酒店名称 */
  title: string;
  /** 入住地址 */
  address: string;
  /** 入住/退房时间 */
  time: TimeRange;
}

/** 景点/活动节点 */
export interface AttractionBlock extends BaseTripBlock {
  kind: 'attraction';
  /** 景点名称 */
  title: string;
  /** 具体地址 */
  address?: string;
  /** 城市 */
  city?: string;
  /** 预估停留时长（小时） */
  estimatedStayHours?: number;
  /** 预计游玩日期 */
  date?: string;
}

/** 其他交通节点（地铁/火车/自驾等） */
export interface TransportBlock extends BaseTripBlock {
  kind: 'transport';
  /** 名称或描述 */
  title: string;
  /** 出发地点 */
  from?: string;
  /** 到达地点 */
  to?: string;
  /** 行程时间 */
  time?: TimeRange;
  /** 交通方式 */
  mode?: 'train' | 'metro' | 'bus' | 'car' | 'walk' | 'other';
}

/** 纯文本备注节点 */
export interface NoteBlock extends BaseTripBlock {
  kind: 'note';
  /** 文本内容 */
  text: string;
}

/** 图片节点，通常用于粘贴截图或示意图 */
export interface ImageBlock extends BaseTripBlock {
  kind: 'image';
  /** 图片资源地址 */
  url: string;
  /** 备用文案 */
  alt?: string;
}

/**
 * 可在画布上渲染的所有节点类型总和。
 */
export type TripBlock =
  | FlightBlock
  | HotelBlock
  | AttractionBlock
  | TransportBlock
  | NoteBlock
  | ImageBlock;

