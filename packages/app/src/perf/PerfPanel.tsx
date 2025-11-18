import React from 'react';
import { UnifiedRenderStats } from '@triplanner/renderer-canvas';

export interface PerfPanelProps {
  stats: UnifiedRenderStats | null;
  history: UnifiedRenderStats[];
  scenarioLabel: string;
  actionLabel: string;
  scenarioDescription: string;
  actionDescription: string;
  blockCount: number;
  connectorCount: number;
  isRunning: boolean;
}

const formatNumber = (value: number, fractionDigits = 1): string =>
  Number.isFinite(value) ? value.toFixed(fractionDigits) : '0.0';

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

export function PerfPanel({
  stats,
  history,
  scenarioLabel,
  actionLabel,
  scenarioDescription,
  actionDescription,
  blockCount,
  connectorCount,
  isRunning,
}: PerfPanelProps) {
  const recentHistory = history.slice(-60);
  const fpsMax = Math.max(1, ...recentHistory.map((item) => item.fps));
  const statusColor = isRunning ? '#2e7d32' : '#546e7a';
  const statusText = isRunning ? '运行中' : '已停止';

  return (
    <div
      style={{
        height: '100%',
        padding: '16px',
        background: '#0b1117',
        color: '#e0f2f1',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Performance Lab</div>
        <div style={{ fontSize: 13, color: '#90a4ae' }}>Canvas Backend · 可视化压测指标</div>
        <div style={{ marginTop: 8, fontSize: 12, color: statusColor }}>● {statusText}</div>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600 }}>{scenarioLabel}</div>
        <div style={{ color: '#90a4ae' }}>{scenarioDescription}</div>
        <div style={{ marginTop: 8, fontWeight: 600 }}>{actionLabel}</div>
        <div style={{ color: '#90a4ae' }}>{actionDescription}</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px',
          fontSize: 13,
        }}
      >
        <div>
          <div style={{ color: '#90a4ae' }}>节点数量</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{blockCount.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ color: '#90a4ae' }}>连线数量</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{connectorCount.toLocaleString()}</div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, color: '#90a4ae', marginBottom: 4 }}>FPS 轨迹（最近 60 帧）</div>
        <div
          style={{
            height: 80,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
            background: '#111821',
            padding: '6px 8px',
            borderRadius: 6,
          }}
        >
          {recentHistory.length === 0 ? (
            <div style={{ color: '#607d8b', fontSize: 12 }}>等待渲染数据...</div>
          ) : (
            recentHistory.map((sample) => (
              <div
                key={sample.timestamp}
                style={{
                  width: 4,
                  height: `${Math.max(4, (sample.fps / fpsMax) * 100)}%`,
                  background: '#26c6da',
                  borderRadius: 1,
                }}
                title={`FPS ${sample.fps.toFixed(1)}`}
              />
            ))
          )}
        </div>
      </div>

      <div
        style={{
          background: '#111821',
          borderRadius: 6,
          padding: '12px',
          fontSize: 13,
          flex: '1 1 auto',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>实时指标</div>
        {stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
            <Metric label="FPS" value={formatNumber(stats.fps, 1)} />
            <Metric label="Frame Time" value={`${formatNumber(stats.frameTimeMs, 2)} ms`} />
            <Metric label="Blocks Rendered" value={stats.blocksRendered.toLocaleString()} />
            <Metric label="Connectors" value={stats.connectorsRendered.toLocaleString()} />
            <Metric label="Dirty Area" value={formatPercent(stats.dirtyAreaRatio)} />
            <Metric label="Draw Calls (估算)" value={stats.drawCalls.toLocaleString()} />
            <Metric label="Vertices (估算)" value={stats.vertices.toLocaleString()} />
            <Metric label="Textures Bound" value={stats.texturesBound.toLocaleString()} />
          </div>
        ) : (
          <div style={{ color: '#607d8b' }}>尚未采集到渲染数据，点击“开始压测”。</div>
        )}
      </div>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div>
      <div style={{ color: '#90a4ae', fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
    </div>
  );
}


