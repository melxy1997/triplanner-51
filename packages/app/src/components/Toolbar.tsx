import { ToolType } from '@triplanner/core';

interface ToolbarProps {
    activeTool: ToolType;
    onSelectTool: (tool: ToolType) => void;
}

export function Toolbar({ activeTool, onSelectTool }: ToolbarProps) {
    const tools: { id: ToolType; label: string; icon: string }[] = [
        { id: 'select', label: 'Select', icon: 'Cursor' },
        { id: 'hand', label: 'Hand', icon: 'Hand' },
        { id: 'rect', label: 'Rectangle', icon: 'Square' },
        { id: 'text', label: 'Text', icon: 'Type' },
        { id: 'connector', label: 'Connect', icon: 'Arrow' },
    ];

    return (
        <div
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-1 flex gap-1 border border-zinc-200 dark:border-zinc-700 z-50"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`
            p-2 rounded-md flex items-center justify-center transition-colors
            ${activeTool === tool.id
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'hover:bg-zinc-100 text-zinc-600 dark:hover:bg-zinc-700 dark:text-zinc-400'}
          `}
                    title={tool.label}
                >
                    {/* Simple text icons for now, replace with Lucide later if needed */}
                    <span className="text-sm font-medium px-2">{tool.label}</span>
                </button>
            ))}
        </div>
    );
}
