import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, MoveHorizontal, MoveVertical, Trash2, MousePointer2 } from 'lucide-react';

interface ImageZoomProps {
    src: string;
    alt: string;
    className?: string;
}

interface Guideline {
    id: number;
    position: number; // Percentage (0-100)
    type: 'h' | 'v';
}

const ImageZoom: React.FC<ImageZoomProps> = ({ src, alt, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTool, setActiveTool] = useState<'none' | 'h' | 'v'>('none');
    const [lines, setLines] = useState<Guideline[]>([]);
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setLines([]); // Reset lines when closing
            setActiveTool('none');
        }
    }, [isOpen]);

    const handleContainerClick = (e: React.MouseEvent) => {
        if (activeTool === 'none' || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newLine: Guideline = {
            id: Date.now(),
            type: activeTool,
            position: activeTool === 'v' ? x : y
        };

        setLines([...lines, newLine]);
    };

    const deleteLine = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setLines(lines.filter(l => l.id !== id));
    };

    const startDrag = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setDraggingId(id);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId === null || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const line = lines.find(l => l.id === draggingId);
        if (!line) return;

        let newPos = 0;
        if (line.type === 'v') {
            newPos = ((e.clientX - rect.left) / rect.width) * 100;
        } else {
            newPos = ((e.clientY - rect.top) / rect.height) * 100;
        }

        // Constrain within bounds
        newPos = Math.max(0, Math.min(100, newPos));

        setLines(lines.map(l => l.id === draggingId ? { ...l, position: newPos } : l));
    };

    const stopDrag = () => {
        setDraggingId(null);
    };

    return (
        <>
            <div
                className={`relative group cursor-pointer inline-block ${className}`}
                onClick={() => setIsOpen(true)}
            >
                <img
                    src={src}
                    alt={alt}
                    className="rounded-lg shadow-sm hover:shadow-md transition-shadow max-w-full h-auto"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="text-white drop-shadow-md" size={32} />
                </div>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black bg-opacity-95 p-4 animate-in fade-in duration-200"
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrag}
                    onMouseLeave={stopDrag}
                >
                    {/* Header/Toolbar */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center space-x-2 bg-gray-800/80 p-1.5 rounded-lg border border-gray-700 pointer-events-auto backdrop-blur-md">
                            <button
                                onClick={() => setActiveTool('none')}
                                className={`p-2 rounded-md transition-colors ${activeTool === 'none' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                title="Mode Navigation"
                            >
                                <MousePointer2 size={20} />
                            </button>
                            <div className="w-px h-6 bg-gray-700 mx-1"></div>
                            <button
                                onClick={() => setActiveTool('v')}
                                className={`p-2 rounded-md transition-colors ${activeTool === 'v' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                title="Ajouter Ligne Verticale"
                            >
                                <MoveVertical size={20} />
                            </button>
                            <button
                                onClick={() => setActiveTool('h')}
                                className={`p-2 rounded-md transition-colors ${activeTool === 'h' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                title="Ajouter Ligne Horizontale"
                            >
                                <MoveHorizontal size={20} />
                            </button>
                            <div className="w-px h-6 bg-gray-700 mx-1"></div>
                            <button
                                onClick={() => setLines([])}
                                className="p-2 rounded-md text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
                                title="Effacer Tout"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        <button
                            className="text-white hover:text-gray-300 transition-colors bg-gray-800/80 rounded-full p-2 pointer-events-auto border border-gray-700"
                            onClick={() => setIsOpen(false)}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Image Container with Overlay */}
                    <div
                        ref={containerRef}
                        className={`relative max-h-[85vh] max-w-[95vw] overflow-hidden select-none shadow-2xl ${activeTool !== 'none' ? 'cursor-crosshair' : 'cursor-default'}`}
                        onClick={handleContainerClick}
                    >
                        <img
                            src={src}
                            alt={alt}
                            className="w-full h-full object-contain rounded-md"
                            draggable={false}
                        />

                        {/* Guidelines Overlay */}
                        {lines.map(line => (
                            <div
                                key={line.id}
                                onMouseDown={(e) => startDrag(e, line.id)}
                                className={`absolute group transition-shadow hover:shadow-lg ${line.type === 'v'
                                        ? 'top-0 bottom-0 w-3 -ml-1.5 cursor-col-resize'
                                        : 'left-0 right-0 h-3 -mt-1.5 cursor-row-resize'
                                    }`}
                                style={{
                                    left: line.type === 'v' ? `${line.position}%` : 0,
                                    top: line.type === 'h' ? `${line.position}%` : 0,
                                    zIndex: draggingId === line.id ? 20 : 10
                                }}
                            >
                                {/* The visible line */}
                                <div className={`absolute ${line.type === 'v' ? 'left-1/2 top-0 bottom-0 w-[2px]' : 'top-1/2 left-0 right-0 h-[2px]'
                                    } ${line.type === 'v' ? 'bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-pink-400/80 shadow-[0_0_8px_rgba(244,114,182,0.5)]'}`}>
                                </div>

                                {/* Delete button on hover */}
                                <button
                                    onClick={(e) => deleteLine(e, line.id)}
                                    className="absolute -top-6 -left-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-lg"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Tooltip */}
                    {activeTool !== 'none' && (
                        <div className="mt-4 text-gray-400 text-sm bg-gray-900/60 px-4 py-1.5 rounded-full border border-gray-800">
                            Cliquez sur le graphique pour placer une ligne {activeTool === 'v' ? 'verticale' : 'horizontale'}. Faites glisser pour déplacer.
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ImageZoom;

