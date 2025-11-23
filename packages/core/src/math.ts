import { Box, Point } from './types';

export const MathUtils = {
    createBox(x: number, y: number, w: number, h: number): Box {
        return { x, y, w, h };
    },

    isPointInBox(p: Point, b: Box): boolean {
        return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    },

    intersectBox(a: Box, b: Box): boolean {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }
};
