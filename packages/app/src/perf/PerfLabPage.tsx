import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EditorState } from '@triplanner/core';
import { StatsTracker, UnifiedRenderStats, WhiteboardRenderer } from '@triplanner/renderer-canvas';
import { PERF_ACTIONS, PERF_SCENARIOS, PerfActionDefinition, PerfScenarioDefinition } from './scenarios.js';
import { PerfPanel } from './PerfPanel.js';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 600;
const HISTORY_LIMIT = 90;

export function PerfLabPage() {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WhiteboardRenderer | null>(null);
  const statsTrackerRef = useRef(new StatsTracker());

  const initialScenario = PERF_SCENARIOS[0]!;
  const initialState = useRef<EditorState>(initialScenario.create());
  const editorStateRef = useRef<EditorState>(initialState.current);

  const [scenarioId, setScenarioId] = useState<string>(initialScenario.id);
  const [actionId, setActionId] = useState<string>(PERF_ACTIONS[0]!.id);
  const [isRunning, setIsRunning] = useState(false);
  const [latestStats, setLatestStats] = useState<UnifiedRenderStats | null>(null);
  const [history, setHistory] = useState<UnifiedRenderStats[]>([]);
  const [sceneInfo, setSceneInfo] = useState({
    blocks: editorStateRef.current.doc.blocks.size,
    connectors: editorStateRef.current.doc.connectors.size,
  });

  const animationRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const stepRef = useRef(0);
  const actionRef = useRef<PerfActionDefinition>(PERF_ACTIONS[0]!);
  const actionMemoRef = useRef<unknown>(actionRef.current.createMemo?.(editorStateRef.current) ?? null);

  const pushStats = useCallback(() => {
    const snapshot = statsTrackerRef.current.getSnapshot();
    if (!snapshot || snapshot.timestamp === 0) {
      return;
    }
    setLatestStats(snapshot);
    setHistory((prev) => {
      const next =
        prev.length >= HISTORY_LIMIT ? [...prev.slice(prev.length - (HISTORY_LIMIT - 1)), snapshot] : [...prev, snapshot];
      return next;
    });
  }, []);

  const selectedScenario = useMemo<PerfScenarioDefinition>(() => {
    return PERF_SCENARIOS.find((s) => s.id === scenarioId) ?? PERF_SCENARIOS[0]!;
  }, [scenarioId]);

  const selectedAction = useMemo<PerfActionDefinition>(() => {
    return PERF_ACTIONS.find((action) => action.id === actionId) ?? PERF_ACTIONS[0]!;
  }, [actionId]);

  const stopRun = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    isRunningRef.current = false;
    setIsRunning(false);
  }, []);

  const renderCurrentState = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }
    renderer.updateState(editorStateRef.current);
    renderer.render();
    pushStats();
  }, [pushStats]);

  const regenerateScenario = useCallback(
    (scenario: PerfScenarioDefinition) => {
      stopRun();
      const nextState = scenario.create();
      editorStateRef.current = nextState;
      setSceneInfo({
        blocks: nextState.doc.blocks.size,
        connectors: nextState.doc.connectors.size,
      });
      statsTrackerRef.current.reset();
      setHistory([]);
      setLatestStats(null);
      actionMemoRef.current = actionRef.current.createMemo?.(nextState) ?? null;
      stepRef.current = 0;
      renderCurrentState();
    },
    [renderCurrentState, stopRun],
  );

  const startRun = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isRunningRef.current) return;
    if (!rendererRef.current) return;

    isRunningRef.current = true;
    setIsRunning(true);
    stepRef.current = 0;

    const tick = () => {
      if (!isRunningRef.current) {
        return;
      }
      stepRef.current += 1;
      const action = actionRef.current;
      const nextState = action.apply({
        state: editorStateRef.current,
        step: stepRef.current,
        memo: actionMemoRef.current ?? undefined,
        renderer: rendererRef.current,
      });
      editorStateRef.current = nextState;
      renderCurrentState();
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
  }, [renderCurrentState]);

  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) {
      return;
    }
    const renderer = new WhiteboardRenderer({
      mainCanvas,
      backgroundCanvas: backgroundCanvasRef.current ?? undefined,
      overlayCanvas: overlayCanvasRef.current ?? undefined,
      statsTracker: statsTrackerRef.current,
    });
    rendererRef.current = renderer;
    renderCurrentState();

    return () => {
      stopRun();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [renderCurrentState, stopRun]);

  useEffect(() => {
    actionRef.current = selectedAction;
    actionMemoRef.current = selectedAction.createMemo?.(editorStateRef.current) ?? null;
    stepRef.current = 0;
  }, [selectedAction]);

  useEffect(() => {
    regenerateScenario(selectedScenario);
  }, [selectedScenario, regenerateScenario]);

  useEffect(() => () => stopRun(), [stopRun]);

  const handleRegenerate = useCallback(() => {
    regenerateScenario(selectedScenario);
  }, [regenerateScenario, selectedScenario]);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: 640 }}>
      <div
        style={{
          width: 280,
          padding: 16,
          borderRight: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>性能实验室</div>
          <p style={{ fontSize: 13, color: '#546e7a', marginTop: 4 }}>
            构造可重复的白板压测场景，实时关注 FPS / frameTime / drawCall。
          </p>
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#607d8b' }}>压测场景</label>
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            style={{ width: '100%', marginTop: 6, padding: '6px 8px' }}
          >
            {PERF_SCENARIOS.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#607d8b' }}>操作脚本</label>
          <select
            value={actionId}
            onChange={(e) => setActionId(e.target.value)}
            style={{ width: '100%', marginTop: 6, padding: '6px 8px' }}
          >
            {PERF_ACTIONS.map((action) => (
              <option key={action.id} value={action.id}>
                {action.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={startRun}
            disabled={isRunning}
            style={{ flex: 1, padding: '8px 0', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            开始压测
          </button>
          <button
            onClick={stopRun}
            disabled={!isRunning}
            style={{ flex: 1, padding: '8px 0', border: '1px solid #c62828', color: '#c62828', borderRadius: 4, background: 'transparent' }}
          >
            停止
          </button>
        </div>

        <button
          onClick={handleRegenerate}
          style={{
            padding: '8px 0',
            border: '1px dashed #90a4ae',
            background: 'transparent',
            borderRadius: 4,
            color: '#455a64',
          }}
        >
          重新生成数据
        </button>

        <div style={{ fontSize: 12, color: '#607d8b' }}>
          <div>节点：{sceneInfo.blocks.toLocaleString()}</div>
          <div>连线：{sceneInfo.connectors.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ flex: '1 1 auto', padding: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <canvas
            ref={backgroundCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ position: 'absolute', inset: 0, zIndex: 0 }}
          />
          <canvas
            ref={mainCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ position: 'absolute', inset: 0, zIndex: 1, boxShadow: '0 12px 32px rgba(15,23,42,0.25)' }}
          />
          <canvas
            ref={overlayCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
          />
        </div>
      </div>

      <div style={{ width: 340 }}>
        <PerfPanel
          stats={latestStats}
          history={history}
          scenarioLabel={selectedScenario.label}
          scenarioDescription={selectedScenario.description}
          actionLabel={selectedAction.label}
          actionDescription={selectedAction.description}
          blockCount={sceneInfo.blocks}
          connectorCount={sceneInfo.connectors}
          isRunning={isRunning}
        />
      </div>
    </div>
  );
}


