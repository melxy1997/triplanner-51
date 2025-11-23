export interface Point {
    x: number;
    y: number;
}

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export type ShapeType = 'rect' | 'text' | 'image' | 'connector';

export type ToolType = 'select' | 'hand' | 'rect' | 'text' | 'connector';

export interface BaseShape {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    rotation: number;
    selected?: boolean;
}

export interface RectShape extends BaseShape {
    type: 'rect';
    w: number;
    h: number;
    fill: string;
    stroke?: string;
}

export interface TextShape extends BaseShape {
    type: 'text';
    content: string;
    fontSize: number;
    fill: string;
}

export type Shape = RectShape | TextShape;

export interface SceneState {
    shapes: Record<string, Shape>;
    selection: string[];
}
