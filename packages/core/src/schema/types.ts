/**
 * 二维坐标，使用白板世界坐标系。
 */
export interface Vec2 {
  /** 横轴坐标 */
  x: number;
  /** 纵轴坐标 */
  y: number;
}

/**
 * 宽高尺寸描述。
 */
export interface Size {
  /** 宽度，单位同世界坐标 */
  width: number;
  /** 高度，单位同世界坐标 */
  height: number;
}

/**
 * 通用的开始结束时间范围，使用 ISO8601 字符串表达。
 */
export interface TimeRange {
  /** 开始时间（ISO8601 字符串） */
  start: string;
  /** 结束时间（ISO8601 字符串） */
  end: string;
}

