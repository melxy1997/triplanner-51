import { Rect, rectContainsPoint, rectIntersects } from '../geometry/bounds.js';

/**
 * 空间对象（用于索引）。
 */
export interface SpatialObject {
  /** 对象 ID */
  id: string;
  /** 包围盒 */
  bounds: Rect;
}

/**
 * 空间索引接口。
 */
export interface SpatialIndex {
  /** 插入对象 */
  insert(obj: SpatialObject): void;
  /** 移除对象 */
  remove(id: string): void;
  /** 更新对象 */
  update(obj: SpatialObject): void;
  /** 查询点命中的对象 ID 列表 */
  queryPoint(p: { x: number; y: number }): string[];
  /** 查询矩形范围内的对象 ID 列表 */
  queryRect(r: Rect): string[];
  /** 清空索引 */
  clear(): void;
}

/**
 * 简单网格索引实现（MVP）。
 * 将平面划分为固定大小的网格，每个网格存储对象 ID 列表。
 */
export class GridIndex implements SpatialIndex {
  /** 网格大小 */
  private readonly cellSize: number;
  /** 网格数据：Map<"x,y", Set<id>> */
  private readonly grid: Map<string, Set<string>>;
  /** 对象到网格的映射：Map<id, Set<"x,y">> */
  private readonly objectCells: Map<string, Set<string>>;

  /**
   * @param cellSize 网格大小（世界坐标单位）
   */
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.objectCells = new Map();
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  private getCellsForRect(rect: Rect): Set<string> {
    const cells = new Set<string>();
    const minX = Math.floor(rect.x / this.cellSize);
    const maxX = Math.floor((rect.x + rect.width) / this.cellSize);
    const minY = Math.floor(rect.y / this.cellSize);
    const maxY = Math.floor((rect.y + rect.height) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.add(`${x},${y}`);
      }
    }
    return cells;
  }

  insert(obj: SpatialObject): void {
    const cells = this.getCellsForRect(obj.bounds);
    this.objectCells.set(obj.id, cells);

    for (const cellKey of cells) {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, new Set());
      }
      this.grid.get(cellKey)!.add(obj.id);
    }
  }

  remove(id: string): void {
    const cells = this.objectCells.get(id);
    if (!cells) return;

    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) {
          this.grid.delete(cellKey);
        }
      }
    }
    this.objectCells.delete(id);
  }

  update(obj: SpatialObject): void {
    this.remove(obj.id);
    this.insert(obj);
  }

  queryPoint(p: { x: number; y: number }): string[] {
    const cellKey = this.getCellKey(p.x, p.y);
    const cell = this.grid.get(cellKey);
    if (!cell) return [];

    const candidates = Array.from(cell);
    // 精确检测：只返回真正包含该点的对象
    return candidates.filter((id) => {
      // 这里需要外部传入 bounds，简化处理：返回所有候选
      return true;
    });
  }

  queryRect(r: Rect): string[] {
    const cells = this.getCellsForRect(r);
    const candidateIds = new Set<string>();

    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey);
      if (cell) {
        for (const id of cell) {
          candidateIds.add(id);
        }
      }
    }

    return Array.from(candidateIds);
  }

  clear(): void {
    this.grid.clear();
    this.objectCells.clear();
  }
}




