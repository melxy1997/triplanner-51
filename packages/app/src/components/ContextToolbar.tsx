import React from 'react';
import { EditorState, removeShape, updateShape } from '@triplanner/core';

interface ContextToolbarProps {
    editorState: EditorState;
    onCommand: (newState: EditorState) => void;
}

export function ContextToolbar({ editorState, onCommand }: ContextToolbarProps) {
    const [selection, setSelection] = React.useState<string[]>([]);

    React.useEffect(() => {
        // Extract selected shape IDs from shapes that have selected=true
        const selectedIds = Array.from(editorState.shapes.values())
            .filter(shape => shape.selected)
            .map(shape => shape.id);
        setSelection(selectedIds);
    }, [editorState.shapes]);

    if (selection.length === 0) return null;

    const handleDelete = () => {
        let newState = editorState;
        selection.forEach(id => {
            newState = removeShape(newState, id);
        });
        onCommand(newState);
    };

    const handleColorChange = (color: string) => {
        let newState = editorState;
        selection.forEach(id => {
            newState = updateShape(newState, id, { fill: color } as any);
        });
        onCommand(newState);
    };

    return (
        <div
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-2 flex gap-2 border border-zinc-200 dark:border-zinc-700 z-50"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            <button
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
                onClick={handleDelete}
            >
                Delete
            </button>
            <div className="w-px bg-zinc-300 dark:bg-zinc-600 mx-1" />
            <div className="flex gap-1">
                {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#000000'].map(color => (
                    <button
                        key={color}
                        className="w-6 h-6 rounded-full border border-zinc-300"
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorChange(color)}
                    />
                ))}
            </div>
        </div>
    );
}
