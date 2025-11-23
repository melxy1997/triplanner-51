"use client";

import { useEffect, useRef, useState } from 'react';
import { Scene, RectShape, TextShape, ToolType, InteractionManager } from '@triplanner/core';
import { CanvasRenderer } from '@triplanner/renderer-canvas';
import { Toolbar } from './Toolbar';

export default function Whiteboard() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<CanvasRenderer | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    const interactionRef = useRef<InteractionManager | null>(null);
    const [activeTool, setActiveTool] = useState<ToolType>('select');

    // Text Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editPos, setEditPos] = useState({ x: 0, y: 0, w: 0, h: 0 });

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        // Initialize Scene
        const scene = new Scene();
        sceneRef.current = scene;

        // Initialize Renderer
        const renderer = new CanvasRenderer(canvasRef.current, scene);
        rendererRef.current = renderer;

        // Initialize Interaction Manager
        const interaction = new InteractionManager(scene, renderer.getCamera());
        interactionRef.current = interaction;

        return () => {
            renderer.dispose();
        };
    }, []);

    // Update tool in interaction manager
    useEffect(() => {
        if (interactionRef.current) {
            interactionRef.current.setTool(activeTool);
        }
    }, [activeTool]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !rendererRef.current) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const renderer = rendererRef.current;
            if (!renderer) return;

            const camera = renderer.getCamera();
            if (e.ctrlKey || e.metaKey) {
                // Zoom
                const zoomFactor = 1 - e.deltaY * 0.001;
                const newZoom = Math.max(0.1, Math.min(5, camera.zoom * zoomFactor));
                // Zoom towards mouse pointer
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                camera.setZoom(newZoom, { x, y });
            } else {
                // Pan
                camera.pan(e.deltaX, e.deltaY);
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (interactionRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            interactionRef.current.onPointerDown(e.clientX - rect.left, e.clientY - rect.top);
            containerRef.current.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (interactionRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            interactionRef.current.onPointerMove(e.clientX - rect.left, e.clientY - rect.top);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (interactionRef.current && containerRef.current) {
            interactionRef.current.onPointerUp();
            containerRef.current.releasePointerCapture(e.pointerId);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (interactionRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            interactionRef.current.onDoubleClick(
                e.clientX - rect.left,
                e.clientY - rect.top,
                (id) => {
                    const shape = sceneRef.current?.getState().shapes[id];
                    if (shape && shape.type === 'text' && rendererRef.current) {
                        const t = shape as any;
                        const camera = rendererRef.current.getCamera();
                        const screenPos = camera.worldToScreen({ x: t.x, y: t.y });

                        setEditingId(id);
                        setEditValue(t.content);
                        setEditPos({
                            x: screenPos.x,
                            y: screenPos.y,
                            w: t.content.length * (t.fontSize || 24) * 0.6 + 20, // Approx width
                            h: (t.fontSize || 24) + 10
                        });
                    }
                }
            );
        }
    };

    const handleTextSubmit = () => {
        if (editingId && sceneRef.current) {
            sceneRef.current.updateShape(editingId, { content: editValue });
            setEditingId(null);
        }
    };

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

            {editingId && (
                <input
                    className="absolute bg-white border border-blue-500 px-1 outline-none shadow-md"
                    style={{
                        left: editPos.x,
                        top: editPos.y,
                        minWidth: editPos.w,
                        height: editPos.h,
                        fontSize: '24px', // Match default font size
                        fontFamily: 'sans-serif',
                        transform: 'translateY(0%)' // Text is drawn at baseline, input is top-left. 
                        // Actually text is drawn at y+fontSize. 
                        // worldToScreen(x,y) gives top-left of text box if we assume standard coords.
                        // Our hit test assumes (x,y) is top-left. 
                        // Renderer draws at (0, fontSize). 
                        // So (x,y) is top-left.
                    }}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleTextSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTextSubmit();
                    }}
                    autoFocus
                />
            )}
        </div>
    );
}
