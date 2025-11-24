import { Scene, Shape, RectShape, TextShape, Camera } from '@triplanner/core';

export class CanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private scene: Scene;
    private camera: Camera;
    private rafId: number | null = null;
    private width: number = 0;
    private height: number = 0;

    constructor(canvas: HTMLCanvasElement, scene: Scene) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.scene = scene;
        this.camera = new Camera();

        this.resize();
        window.addEventListener('resize', this.resize);

        this.start();
    }

    getCamera() {
        return this.camera;
    }

    resize = () => {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.width = parent.clientWidth;
            this.height = parent.clientHeight;
            this.canvas.width = this.width * window.devicePixelRatio;
            this.canvas.height = this.height * window.devicePixelRatio;
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    };

    start() {
        if (!this.rafId) {
            this.loop();
        }
    }

    stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private loop = () => {
        this.render();
        this.rafId = requestAnimationFrame(this.loop);
    };

    render(scene?: Scene, camera?: Camera) {
        const targetScene = scene || this.scene;
        const targetCamera = camera || this.camera;

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.ctx.save();
        // Apply Camera Transform
        this.ctx.scale(targetCamera.zoom, targetCamera.zoom);
        this.ctx.translate(-targetCamera.x, -targetCamera.y);

        this.drawGrid(targetCamera);

        const { shapes } = targetScene.getState();
        Object.values(shapes).forEach(shape => {
            this.ctx.save();
            this.drawShape(shape, targetScene, targetCamera);
            this.ctx.restore();
        });

        this.ctx.restore();
    }

    private drawGrid(camera: Camera) {
        const viewport = camera.getViewport(this.width, this.height);
        const gridSize = 50;

        const startX = Math.floor(viewport.x / gridSize) * gridSize;
        const endX = startX + viewport.w + gridSize;
        const startY = Math.floor(viewport.y / gridSize) * gridSize;
        const endY = startY + viewport.h + gridSize;

        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1 / camera.zoom;
        this.ctx.beginPath();

        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }
        this.ctx.stroke();
    }

    private drawShape(shape: Shape, scene: Scene, camera: Camera) {
        this.ctx.translate(shape.x, shape.y);

        if (shape.type === 'rect') {
            this.drawRect(shape as RectShape, camera);
        } else if (shape.type === 'text') {
            this.drawText(shape as TextShape);
        }

        // Draw selection outline
        const isSelected = scene.getState().selection.includes(shape.id);
        if (isSelected) {
            this.ctx.strokeStyle = '#00a0ff';
            this.ctx.lineWidth = 2 / camera.zoom;

            if (shape.type === 'rect') {
                const s = shape as RectShape;
                // Handle negative width/height for selection box
                const x = s.w < 0 ? s.w : 0;
                const y = s.h < 0 ? s.h : 0;
                const w = Math.abs(s.w);
                const h = Math.abs(s.h);
                this.ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

                // Draw Resize Handles (Corners)
                this.ctx.fillStyle = '#ffffff';
                this.ctx.strokeStyle = '#00a0ff';
                const handleSize = 8 / camera.zoom;
                const half = handleSize / 2;

                // TL, TR, BL, BR
                const handles = [
                    { x: x - half, y: y - half },
                    { x: x + w - half, y: y - half },
                    { x: x - half, y: y + h - half },
                    { x: x + w - half, y: y + h - half }
                ];

                handles.forEach(h => {
                    this.ctx.fillRect(h.x, h.y, handleSize, handleSize);
                    this.ctx.strokeRect(h.x, h.y, handleSize, handleSize);
                });
            } else if (shape.type === 'text') {
                const s = shape as TextShape;
                const fontSize = s.fontSize || 24;
                const width = this.ctx.measureText(s.content).width;
                const height = fontSize;

                // Text is drawn at (0, fontSize) relative to origin
                // So bounding box is (0, 0) to (width, height)
                this.ctx.strokeRect(-2, -2, width + 4, height + 4);
            }
        }
    }

    private drawRect(shape: RectShape, camera: Camera) {
        const x = shape.w < 0 ? shape.w : 0;
        const y = shape.h < 0 ? shape.h : 0;
        const w = Math.abs(shape.w);
        const h = Math.abs(shape.h);

        this.ctx.fillStyle = shape.fill;
        this.ctx.fillRect(x, y, w, h);
        if (shape.stroke) {
            this.ctx.strokeStyle = shape.stroke;
            this.ctx.lineWidth = 2 / camera.zoom;
            this.ctx.strokeRect(0, 0, shape.w, shape.h);
        }
    }

    private drawText(shape: TextShape) {
        this.ctx.font = `${shape.fontSize}px sans-serif`;
        this.ctx.fillStyle = shape.fill;
        this.ctx.fillText(shape.content, 0, shape.fontSize);
    }

    dispose() {
        this.stop();
        window.removeEventListener('resize', this.resize);
    }
}
