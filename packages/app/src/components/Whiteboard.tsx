"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import {
    ToolType,
    createEmptyEditorState,
    EditorState,
    addShape,
    updateShape,
    undo,
    redo,
    RectShape,
    TextShape,
    Shape
} from '@triplanner/core';
import { CanvasRenderer } from '@triplanner/renderer-canvas';
import { Toolbar } from './Toolbar';
import { ContextToolbar } from './ContextToolbar';
import { Camera } from '@triplanner/core';

export default function Whiteboard() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<CanvasRenderer | null>(null);
    const cameraRef = useRef<Camera | null>(null);

    // EditorState as single source of truth
    const [editorState, setEditorState] = useState<EditorState>(() => createEmptyEditorState());
    const [activeTool, setActiveTool] = useState<ToolType>('select');

    // Text Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editPos, setEditPos] = useState({ x: 0, y: 0, w: 0, h: 0 });

    // Interaction state
    const isDraggingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const selectedShapeIdRef = useRef<string | null>(null);
    const activeHandleRef = useRef<string | null>(null); // 'tl', 'tr', 'bl', 'br'

    // Initialize renderer and camera
    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const camera = new Camera();
        cameraRef.current = camera;

        // Create a minimal Scene-like object for CanvasRenderer
        const scene = {
            getState: () => ({
                shapes: Object.fromEntries(editorState.shapes),
                selection: Array.from(editorState.shapes.values())
                    .filter(s => s.selected)
                    .map(s => s.id)
            }),
            subscribe: () => () => { }
        };

        const renderer = new CanvasRenderer(canvasRef.current, scene as any);
        rendererRef.current = renderer;

        // Use ResizeObserver to handle container resizing
        const resizeObserver = new ResizeObserver(() => {
            renderer.resize();
            renderer.render(scene as any, camera);
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            renderer.dispose();
        };
    }, []);

    // Trigger re-render when editorState changes
    useEffect(() => {
        if (!rendererRef.current) return;

        // Update the scene reference with new shapes
        const scene = {
            getState: () => ({
                shapes: Object.fromEntries(editorState.shapes),
                selection: Array.from(editorState.shapes.values())
                    .filter(s => s.selected)
                    .map(s => s.id)
            }),
            subscribe: () => () => { }
        };

        // Force update renderer's scene reference
        (rendererRef.current as any).scene = scene;

        // Trigger a render
        rendererRef.current.render(scene as any, cameraRef.current!);
    }, [editorState]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    setEditorState(redo(editorState));
                } else {
                    setEditorState(undo(editorState));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editorState]);

    // Mouse wheel for pan/zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !cameraRef.current) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const camera = cameraRef.current!;

            if (e.ctrlKey || e.metaKey) {
                const zoomFactor = 1 - e.deltaY * 0.001;
                const newZoom = Math.max(0.1, Math.min(5, camera.zoom * zoomFactor));
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                camera.setZoom(newZoom, { x, y });
            } else {
                camera.pan(e.deltaX, e.deltaY);
            }

            // Trigger re-render
            if (rendererRef.current) {
                const scene = {
                    getState: () => ({
                        shapes: Object.fromEntries(editorState.shapes),
                        selection: Array.from(editorState.shapes.values())
                            .filter(s => s.selected)
                            .map(s => s.id)
                    }),
                    subscribe: () => () => { }
                };
                rendererRef.current.render(scene as any, camera);
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [editorState]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!containerRef.current || !cameraRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldPoint = cameraRef.current.screenToWorld({ x: screenX, y: screenY });

        isDraggingRef.current = true;
        lastPointRef.current = { x: screenX, y: screenY };

        // Check for resize handles first if selection exists
        const selectedShapes = Array.from(editorState.shapes.values()).filter(s => s.selected);
        if (selectedShapes.length === 1) {
            const shape = selectedShapes[0];
            if (shape.type === 'rect') {
                const r = shape as RectShape;
                const bx = r.w < 0 ? r.x + r.w : r.x;
                const by = r.h < 0 ? r.y + r.h : r.y;
                const bw = Math.abs(r.w);
                const bh = Math.abs(r.h);

                const handleSize = 10 / cameraRef.current.zoom;
                const half = handleSize / 2;

                // Check corners
                if (Math.abs(worldPoint.x - bx) < half && Math.abs(worldPoint.y - by) < half) activeHandleRef.current = 'tl';
                else if (Math.abs(worldPoint.x - (bx + bw)) < half && Math.abs(worldPoint.y - by) < half) activeHandleRef.current = 'tr';
                else if (Math.abs(worldPoint.x - bx) < half && Math.abs(worldPoint.y - (by + bh)) < half) activeHandleRef.current = 'bl';
                else if (Math.abs(worldPoint.x - (bx + bw)) < half && Math.abs(worldPoint.y - (by + bh)) < half) activeHandleRef.current = 'br';

                if (activeHandleRef.current) {
                    selectedShapeIdRef.current = shape.id;
                    containerRef.current?.setPointerCapture(e.pointerId);
                    return;
                }
            }
        }

        if (activeTool === 'rect') {
            // Create new rectangle
            const rect: RectShape = {
                id: `rect-${Date.now()}`,
                type: 'rect',
                x: worldPoint.x,
                y: worldPoint.y,
                w: 0, // Start with 0 size
                h: 0,
                rotation: 0,
                fill: '#3b82f6',
                stroke: '#1e40af',
                selected: true // Select immediately
            };
            // Deselect others
            let newState = editorState;
            editorState.shapes.forEach(s => {
                if (s.selected) newState = updateShape(newState, s.id, { selected: false } as any, { addToHistory: false });
            });

            newState = addShape(newState, rect);
            setEditorState(newState);
            selectedShapeIdRef.current = rect.id;
            activeHandleRef.current = 'br'; // Treat as resizing bottom-right
        } else if (activeTool === 'text') {
            // Create new text
            const text: TextShape = {
                id: `text-${Date.now()}`,
                type: 'text',
                x: worldPoint.x,
                y: worldPoint.y,
                rotation: 0,
                content: 'Double click to edit',
                fontSize: 24,
                fill: '#000000',
                selected: true
            };
            // Deselect others
            let newState = editorState;
            editorState.shapes.forEach(s => {
                if (s.selected) newState = updateShape(newState, s.id, { selected: false } as any, { addToHistory: false });
            });

            newState = addShape(newState, text);
            setEditorState(newState);
            setActiveTool('select'); // Switch back to select
        } else if (activeTool === 'connector') {
            // TODO: Implement connector creation
            console.log('Connector tool not implemented yet');
            setActiveTool('select');
        } else if (activeTool === 'select') {
            // Hit test and select
            const shapes = Array.from(editorState.shapes.values()).reverse();
            const hit = shapes.find(shape => {
                if (shape.type === 'rect') {
                    const r = shape as RectShape;
                    // Normalize for hit testing
                    const bx = r.w < 0 ? r.x + r.w : r.x;
                    const by = r.h < 0 ? r.y + r.h : r.y;
                    const bw = Math.abs(r.w);
                    const bh = Math.abs(r.h);
                    return worldPoint.x >= bx && worldPoint.x <= bx + bw &&
                        worldPoint.y >= by && worldPoint.y <= by + bh;
                } else if (shape.type === 'text') {
                    const t = shape as TextShape;
                    const estimatedWidth = t.content.length * t.fontSize * 0.6;
                    const estimatedHeight = t.fontSize;
                    return worldPoint.x >= t.x && worldPoint.x <= t.x + estimatedWidth &&
                        worldPoint.y >= t.y && worldPoint.y <= t.y + estimatedHeight;
                }
                return false;
            });

            let newState = editorState;
            // Deselect all
            editorState.shapes.forEach((shape) => {
                if (shape.selected) {
                    newState = updateShape(newState, shape.id, { selected: false } as any, { addToHistory: false });
                }
            });

            if (hit) {
                newState = updateShape(newState, hit.id, { selected: true } as any, { addToHistory: false });
                selectedShapeIdRef.current = hit.id;
            } else {
                selectedShapeIdRef.current = null;
            }

            setEditorState(newState);
        }

        containerRef.current?.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDraggingRef.current || !lastPointRef.current || !cameraRef.current || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        const dx = screenX - lastPointRef.current.x;
        const dy = screenY - lastPointRef.current.y;

        const worldDx = dx / cameraRef.current.zoom;
        const worldDy = dy / cameraRef.current.zoom;

        if (activeHandleRef.current && selectedShapeIdRef.current) {
            // Resize logic
            const shape = editorState.shapes.get(selectedShapeIdRef.current);
            if (shape && shape.type === 'rect') {
                const r = shape as RectShape;
                let { x, y, w, h } = r;

                if (activeHandleRef.current === 'br') {
                    w += worldDx;
                    h += worldDy;
                } else if (activeHandleRef.current === 'tr') {
                    y += worldDy;
                    h -= worldDy;
                    w += worldDx;
                } else if (activeHandleRef.current === 'bl') {
                    x += worldDx;
                    w -= worldDx;
                    h += worldDy;
                } else if (activeHandleRef.current === 'tl') {
                    x += worldDx;
                    y += worldDy;
                    w -= worldDx;
                    h -= worldDy;
                }

                setEditorState(updateShape(editorState, shape.id, { x, y, w, h } as any, { addToHistory: false }));
            }
        } else if (activeTool === 'hand') {
            cameraRef.current.pan(dx, dy);
            if (rendererRef.current) {
                const scene = {
                    getState: () => ({
                        shapes: Object.fromEntries(editorState.shapes),
                        selection: Array.from(editorState.shapes.values())
                            .filter(s => s.selected)
                            .map(s => s.id)
                    }),
                    subscribe: () => () => { }
                };
                rendererRef.current.render(scene as any, cameraRef.current);
            }
        } else if ((activeTool === 'select' || activeTool === 'rect') && selectedShapeIdRef.current && !activeHandleRef.current) {
            // Move shape
            const shape = editorState.shapes.get(selectedShapeIdRef.current);
            if (shape) {
                setEditorState(updateShape(editorState, shape.id, {
                    x: shape.x + worldDx,
                    y: shape.y + worldDy
                } as any, { addToHistory: false, groupId: 'drag' }));
            }
        }

        lastPointRef.current = { x: screenX, y: screenY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDraggingRef.current = false;
        lastPointRef.current = null;
        activeHandleRef.current = null;
        containerRef.current?.releasePointerCapture(e.pointerId);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (!containerRef.current || !cameraRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldPoint = cameraRef.current.screenToWorld({ x: screenX, y: screenY });

        const shapes = Array.from(editorState.shapes.values()).reverse();
        const hit = shapes.find(shape => {
            if (shape.type === 'text') {
                const t = shape as TextShape;
                const estimatedWidth = t.content.length * t.fontSize * 0.6;
                const estimatedHeight = t.fontSize;
                return worldPoint.x >= t.x && worldPoint.x <= t.x + estimatedWidth &&
                    worldPoint.y >= t.y && worldPoint.y <= t.y + estimatedHeight;
            }
            return false;
        });

        if (hit && hit.type === 'text') {
            const t = hit as TextShape;
            const screenPos = cameraRef.current.worldToScreen({ x: t.x, y: t.y });

            setEditingId(hit.id);
            setEditValue(t.content);
            setEditPos({
                x: screenPos.x,
                y: screenPos.y,
                w: t.content.length * t.fontSize * 0.6 + 20,
                h: t.fontSize + 10
            });
        }
    };

    const handleTextSubmit = () => {
        if (editingId) {
            setEditorState(updateShape(editorState, editingId, { content: editValue } as any));
            setEditingId(null);
        }
    };

    const handleCommand = useCallback((newState: EditorState) => {
        setEditorState(newState);
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative bg-gray-50 overflow-hidden touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
        >
            <canvas
                ref={canvasRef}
                className={`block w-full h-full ${activeTool === 'hand' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            />
            <Toolbar activeTool={activeTool} onSelectTool={setActiveTool} />

            <ContextToolbar editorState={editorState} onCommand={handleCommand} />

            {editingId && (
                <input
                    className="absolute bg-white border border-blue-500 px-1 outline-none shadow-md"
                    style={{
                        left: editPos.x,
                        top: editPos.y,
                        minWidth: editPos.w,
                        height: editPos.h,
                        fontSize: '24px',
                        fontFamily: 'sans-serif',
                        transform: 'translateY(0%)',
                        zIndex: 100 // Ensure it's on top
                    }}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleTextSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTextSubmit();
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent canvas interaction
                    autoFocus
                />
            )}
        </div>
    );
}
