const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Canvas/WebGL 统一渲染指标。
 */
export interface UnifiedRenderStats {
  frameTimeMs: number;
  fps: number;
  blocksRendered: number;
  connectorsRendered: number;
  dirtyAreaRatio: number;
  drawCalls: number;
  vertices: number;
  texturesBound: number;
  timestamp: number;
}

export interface RenderStatsInput {
  frameTimeMs: number;
  blocksRendered: number;
  connectorsRendered: number;
  dirtyAreaRatio: number;
  drawCalls: number;
  vertices: number;
  texturesBound: number;
}

export interface StatsTrackerOptions {
  /**
   * FPS 指标的平滑系数，越大表示越依赖瞬时 FPS。
   */
  fpsSmoothing?: number;
}

const clamp01 = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const createInitialStats = (): UnifiedRenderStats => ({
  frameTimeMs: 0,
  fps: 0,
  blocksRendered: 0,
  connectorsRendered: 0,
  dirtyAreaRatio: 0,
  drawCalls: 0,
  vertices: 0,
  texturesBound: 0,
  timestamp: 0,
});

/**
 * 负责维护渲染指标时间序列的采集器。
 */
export class StatsTracker {
  private lastStats: UnifiedRenderStats = createInitialStats();
  private readonly fpsSmoothing: number;

  constructor(options: StatsTrackerOptions = {}) {
    this.fpsSmoothing = options.fpsSmoothing ?? 0.2;
  }

  /**
   * 记录一次渲染数据，并返回最新的快照。
   */
  record(sample: RenderStatsInput): UnifiedRenderStats {
    const timestamp = now();
    const instantaneousFps = sample.frameTimeMs > 0 ? 1000 / sample.frameTimeMs : 0;
    const fps =
      this.lastStats.timestamp === 0
        ? instantaneousFps
        : this.lastStats.fps + this.fpsSmoothing * (instantaneousFps - this.lastStats.fps);

    const stats: UnifiedRenderStats = {
      frameTimeMs: sample.frameTimeMs,
      fps: Number.isFinite(fps) ? fps : 0,
      blocksRendered: sample.blocksRendered,
      connectorsRendered: sample.connectorsRendered,
      dirtyAreaRatio: clamp01(sample.dirtyAreaRatio),
      drawCalls: sample.drawCalls,
      vertices: sample.vertices,
      texturesBound: sample.texturesBound,
      timestamp,
    };

    this.lastStats = stats;
    return stats;
  }

  /**
   * 返回最近一次记录的快照。
   */
  getSnapshot(): UnifiedRenderStats {
    return this.lastStats;
  }

  /**
   * 重置采集器的内部状态。
   */
  reset(): void {
    this.lastStats = createInitialStats();
  }
}


