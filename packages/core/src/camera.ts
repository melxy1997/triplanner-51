import { Point, Box } from './types';

export class Camera {
    x: number = 0;
    y: number = 0;
    zoom: number = 1;

    constructor(x: number = 0, y: number = 0, zoom: number = 1) {
        this.x = x;
        this.y = y;
        this.zoom = zoom;
    }

    pan(dx: number, dy: number) {
        this.x -= dx / this.zoom;
        this.y -= dy / this.zoom;
    }

    setZoom(zoom: number, center?: Point) {
        if (center) {
            const before = this.screenToWorld(center);
            this.zoom = zoom;
            const after = this.screenToWorld(center);
            this.x += before.x - after.x;
            this.y += before.y - after.y;
        } else {
            this.zoom = zoom;
        }
    }

    screenToWorld(p: Point): Point {
        return {
            x: p.x / this.zoom + this.x,
            y: p.y / this.zoom + this.y
        };
    }

    worldToScreen(p: Point): Point {
        return {
            x: (p.x - this.x) * this.zoom,
            y: (p.y - this.y) * this.zoom
        };
    }

    getViewport(width: number, height: number): Box {
        return {
            x: this.x,
            y: this.y,
            w: width / this.zoom,
            h: height / this.zoom
        };
    }
}
