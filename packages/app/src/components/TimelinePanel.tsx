import React, { useMemo } from 'react';
import { TimelineId, TimelineItem, BlockId, TripBlock } from '@triplanner/core';

/**
 * Timeline 面板 Props。
 */
export interface TimelinePanelProps {
  /** Timeline Map */
  timeline: Map<TimelineId, TimelineItem>;
  /** Block Map */
  blocks: Map<BlockId, TripBlock>;
  /** 当前选中的 Block */
  selectedBlockIds: BlockId[];
  /** 点击条目时的回调 */
  onSelectTimelineItem?: (item: TimelineItem) => void;
}

/**
 * Timeline 面板：展示按照日期分组的行程条目。
 */
export function TimelinePanel({
  timeline,
  blocks,
  selectedBlockIds,
  onSelectTimelineItem,
}: TimelinePanelProps) {
  const grouped = useMemo(() => {
    const entries = Array.from(timeline.values());
    entries.sort((a, b) => {
      if (a.day === b.day) {
        return (a.order ?? 0) - (b.order ?? 0);
      }
      return a.day.localeCompare(b.day);
    });

    const map = new Map<string, TimelineItem[]>();
    for (const item of entries) {
      if (!map.has(item.day)) {
        map.set(item.day, []);
      }
      map.get(item.day)!.push(item);
    }
    return Array.from(map.entries());
  }, [timeline]);

  if (grouped.length === 0) {
    return (
      <div style={{ padding: '12px', color: '#888', fontSize: '14px' }}>
        暂无行程，先在白板上添加航班/酒店吧。
      </div>
    );
  }

  return (
    <div style={{ padding: '12px', overflowY: 'auto', height: '100%' }}>
      {grouped.map(([day, items]) => (
        <div key={day} style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 600, color: '#333', marginBottom: '8px' }}>{day}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item) => {
              const block = blocks.get(item.blockId);
              const selected = selectedBlockIds.includes(item.blockId);
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTimelineItem?.(item)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px',
                    borderRadius: '6px',
                    border: selected ? '1px solid #1976d2' : '1px solid #e0e0e0',
                    background: selected ? 'rgba(25, 118, 210, 0.1)' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontWeight: 500, color: '#333' }}>
                    {block?.kind.toUpperCase()} · {block && 'title' in block ? (block as any).title : block?.id}
                  </span>
                  {item.timeRange ? (
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(item.timeRange.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(item.timeRange.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


