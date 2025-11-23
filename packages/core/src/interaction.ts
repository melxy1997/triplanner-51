import { Scene } from './scene';
import { Camera } from './camera';
import { ToolType, Point } from './types';

export class InteractionManager {
    private scene: Scene;
    private camera: Camera;
    private activeTool: ToolType = 'select';
    private isDragging: boolean = false;
    private lastPoint: Point | null = null;

    constructor(scene: Scene, camera: Camera) {
        this.scene = scene;
        this.camera = camera;
    }

    setTool(tool: ToolType) {
        this.activeTool = tool;
    }

    private activeHandle: string | null = null; // 'tl', 'tr', 'bl', 'br'

    onPointerDown(x: number, y: number) {
        this.isDragging = true;
        this.lastPoint = { x, y };
        const worldPoint = this.camera.screenToWorld({ x, y });

        // Check for resize handles first if selection exists
        const selection = this.scene.getState().selection;
        if (selection.length === 1) {
            const id = selection[0];
            const shape = this.scene.getState().shapes[id];
            if (shape && shape.type === 'rect') {
                const r = shape as any;
                const bx = r.w < 0 ? r.x + r.w : r.x;
                const by = r.h < 0 ? r.y + r.h : r.y;
                const bw = Math.abs(r.w);
                const bh = Math.abs(r.h);

                const handleSize = 10 / this.camera.zoom; // Slightly larger hit area
                const half = handleSize / 2;

                // Check corners
                if (Math.abs(worldPoint.x - bx) < half && Math.abs(worldPoint.y - by) < half) this.activeHandle = 'tl';
                else if (Math.abs(worldPoint.x - (bx + bw)) < half && Math.abs(worldPoint.y - by) < half) this.activeHandle = 'tr';
                else if (Math.abs(worldPoint.x - bx) < half && Math.abs(worldPoint.y - (by + bh)) < half) this.activeHandle = 'bl';
                else if (Math.abs(worldPoint.x - (bx + bw)) < half && Math.abs(worldPoint.y - (by + bh)) < half) this.activeHandle = 'br';

                if (this.activeHandle) {
                    return; // Start resizing
                }
            }
        }

        if (this.activeTool === 'select') {
            // Hit testing
            const shapes = Object.values(this.scene.getState().shapes).reverse(); // Top first
            const hit = shapes.find(shape => {
                if (shape.type === 'rect') {
                    const r = shape as any; // Cast to access w/h
                    // Normalize bounds for hit testing
                    const bx = r.w < 0 ? r.x + r.w : r.x;
                    const by = r.h < 0 ? r.y + r.h : r.y;
                    const bw = Math.abs(r.w);
                    const bh = Math.abs(r.h);

                    return worldPoint.x >= bx && worldPoint.x <= bx + bw &&
                        worldPoint.y >= by && worldPoint.y <= by + bh;
                } else if (shape.type === 'text') {
                    // Approximate text bounds
                    const t = shape as any;
                    const fontSize = t.fontSize || 24;
                    const estimatedWidth = t.content.length * fontSize * 0.6;
                    const estimatedHeight = fontSize;
                    // Text is drawn at (x, y+fontSize) with alphabetic baseline, so it occupies (x, y) to (x+w, y+h)
                    return worldPoint.x >= t.x && worldPoint.x <= t.x + estimatedWidth &&
                        worldPoint.y >= t.y && worldPoint.y <= t.y + estimatedHeight;
                }
                return false;
            });

            if (hit) {
                this.scene.getState().selection = [hit.id];
                // console.log('Selected:', hit.id);
            } else {
                this.scene.getState().selection = [];
            }
        } else if (this.activeTool === 'rect') {
            // Create new rect
            const id = `rect-${Date.now()}`;
            this.scene.addShape({
                id,
                type: 'rect',
                x: worldPoint.x,
                y: worldPoint.y,
                w: 0,
                h: 0,
                rotation: 0,
                fill: '#3b82f6',
                stroke: '#1e40af'
            });
            this.scene.getState().selection = [id]; // Select the new shape to resize it
            this.activeHandle = 'br'; // Treat new rect creation as resizing bottom-right
        } else if (this.activeTool === 'text') {
            // Create new text
            const id = `text-${Date.now()}`;
            this.scene.addShape({
                id,
                type: 'text',
                x: worldPoint.x,
                y: worldPoint.y,
                rotation: 0,
                content: 'Double click to edit',
                fontSize: 24,
                fill: '#000000'
            });
            this.scene.getState().selection = [id];
            this.activeTool = 'select'; // Switch back to select after creating text
        }
    }

    onPointerMove(x: number, y: number) {
        if (!this.isDragging || !this.lastPoint) return;

        const dx = x - this.lastPoint.x;
        const dy = y - this.lastPoint.y;
        // Convert screen delta to world delta for shape movement
        const worldDx = dx / this.camera.zoom;
        const worldDy = dy / this.camera.zoom;

        if (this.activeHandle) {
            // Resize logic
            const id = this.scene.getState().selection[0];
            const shape = this.scene.getState().shapes[id] as any;
            if (shape) {
                let { x, y, w, h } = shape;

                if (this.activeHandle === 'br') {
                    w += worldDx;
                    h += worldDy;
                } else if (this.activeHandle === 'tr') {
                    y += worldDy;
                    h -= worldDy;
                    w += worldDx;
                } else if (this.activeHandle === 'bl') {
                    x += worldDx;
                    w -= worldDx;
                    h += worldDy;
                } else if (this.activeHandle === 'tl') {
                    x += worldDx;
                    y += worldDy;
                    w -= worldDx;
                    h -= worldDy;
                }

                this.scene.updateShape(id, { x, y, w, h });
            }
        } else if (this.activeTool === 'hand') {
            this.camera.pan(dx, dy);
        } else if (this.activeTool === 'select') {
            const selection = this.scene.getState().selection;
            selection.forEach(id => {
                const shape = this.scene.getState().shapes[id];
                if (shape) {
                    this.scene.updateShape(id, {
                        x: shape.x + worldDx,
                        y: shape.y + worldDy
                    });
                }
            });
        } else if (this.activeTool === 'rect') {
            const selection = this.scene.getState().selection;
            if (selection.length > 0) {
                const id = selection[0];
                const shape = this.scene.getState().shapes[id];
                if (shape && shape.type === 'rect') {
                    // Just update width/height.
                    // Normalization happens at render/hit-test time or we can normalize on pointer up.
                    // For now, allow negative w/h to support dragging in any direction.
                    this.scene.updateShape(id, {
                        w: shape.w + worldDx,
                        h: shape.h + worldDy
                    });
                }
            }
        }

        this.lastPoint = { x, y };
    }

    onPointerUp() {
        this.isDragging = false;
        this.lastPoint = null;
        this.activeHandle = null;
    }

    onDoubleClick(x: number, y: number, onEdit: (id: string) => void) {
        const worldPoint = this.camera.screenToWorld({ x, y });
        const shapes = Object.values(this.scene.getState().shapes).reverse();
        const hit = shapes.find(shape => {
            if (shape.type === 'text') {
                const t = shape as any;
                const fontSize = t.fontSize || 24;
                const estimatedWidth = t.content.length * fontSize * 0.6;
                const estimatedHeight = fontSize;
                return worldPoint.x >= t.x && worldPoint.x <= t.x + estimatedWidth &&
                    worldPoint.y >= t.y && worldPoint.y <= t.y + estimatedHeight;
            }
            return false;
        });

        if (hit && hit.type === 'text') {
            onEdit(hit.id);
        }
    }
}
