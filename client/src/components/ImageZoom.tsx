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
    const [activeTool, setActiveTool] = useState<'none' | 'h' | 'v' | 'loupe'>('none');
    const [lines, setLines] = useState<Guideline[]>([]);
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setLines([]); // Reset lines when closing
            setActiveTool('none');
            setScale(1);
            setOffset({ x: 0, y: 0 });
        }
    }, [isOpen]);

    const handleContainerClick = (e: React.MouseEvent) => {
        if (activeTool === 'none' || activeTool === 'loupe' || !containerRef.current) return;

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

    const startDragOrPan = (e: React.MouseEvent, id?: number) => {
        e.stopPropagation();
        if (id !== undefined) {
            setDraggingId(id);
        } else if (activeTool === 'none') {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        // Update mouse pos for loupe
        setMousePos({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        });

        if (draggingId !== null) {
            const line = lines.find(l => l.id === draggingId);
            if (!line) return;

            let newPos = 0;
            if (line.type === 'v') {
                newPos = ((e.clientX - rect.left) / rect.width) * 100;
            } else {
                newPos = ((e.clientY - rect.top) / rect.height) * 100;
            }

            newPos = Math.max(0, Math.min(100, newPos));
            setLines(lines.map(l => l.id === draggingId ? { ...l, position: newPos } : l));
        } else if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const stopAction = () => {
        setDraggingId(null);
        setIsPanning(false);
    };

    const handleZoom = (delta: number) => {
        setScale(prev => {
            const newScale = Math.max(1, Math.min(4, prev + delta));
            if (newScale === 1) setOffset({ x: 0, y: 0 });
            return newScale;
        });
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
                    className="fixed inset-0 z-[100] flex flex-row bg-black bg-opacity-95 animate-in fade-in duration-200"
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopAction}
                    onMouseLeave={stopAction}
                >
                    {/* Vertical Sidebar Toolbar */}
                    <div className="w-20 md:w-24 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-6 space-y-4 shadow-2xl z-20 overflow-y-auto pointer-events-auto">
                        <button
                            onClick={() => setActiveTool('none')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all w-16 h-16 ${activeTool === 'none' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            title="Navigation"
                        >
                            <MousePointer2 size={24} />
                            <span className="text-[10px] font-bold mt-1 uppercase">Nav</span>
                        </button>

                        <div className="w-10 h-px bg-gray-800 my-1"></div>

                        <button
                            onClick={() => setActiveTool('v')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all w-16 h-16 ${activeTool === 'v' ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20' : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30'}`}
                            title="Ligne Verticale"
                        >
                            <MoveVertical size={24} />
                            <span className="text-[10px] font-bold mt-1 uppercase">Ligne V</span>
                        </button>

                        <button
                            onClick={() => setActiveTool('h')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all w-16 h-16 ${activeTool === 'h' ? 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20' : 'text-pink-400 hover:text-pink-300 hover:bg-pink-900/30'}`}
                            title="Ligne Horizontale"
                        >
                            <MoveHorizontal size={24} />
                            <span className="text-[10px] font-bold mt-1 uppercase">Ligne H</span>
                        </button>

                        <button
                            onClick={() => setActiveTool(activeTool === 'loupe' ? 'none' : 'loupe')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all w-16 h-16 ${activeTool === 'loupe' ? 'bg-yellow-500 text-black font-bold shadow-lg' : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30'}`}
                            title="Loupe"
                        >
                            <ZoomIn size={24} />
                            <span className="text-[10px] font-bold mt-1 uppercase">Loupe</span>
                        </button>

                        <div className="w-10 h-px bg-gray-800 my-1"></div>

                        {/* Zoom Controls */}
                        <div className="flex flex-col items-center space-y-2 py-2">
                            <button
                                onClick={() => handleZoom(0.5)}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-all font-bold"
                            >
                                <ZoomIn size={18} />
                            </button>
                            <span className="text-white text-[10px] font-mono">{scale.toFixed(1)}x</span>
                            <button
                                onClick={() => handleZoom(-0.5)}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-all font-bold text-xl"
                            >
                                -
                            </button>
                        </div>

                        <div className="flex-grow"></div>

                        <button
                            onClick={() => { setLines([]); setScale(1); setOffset({ x: 0, y: 0 }); }}
                            className="p-3 rounded-xl text-red-400 hover:bg-red-900/40 transition-all w-16 h-16 flex flex-col items-center justify-center"
                            title="Reset"
                        >
                            <Trash2 size={24} />
                            <span className="text-[10px] font-bold mt-1 uppercase">Reset</span>
                        </button>
                    </div>

                    {/* Main Workspace Area */}
                    <div className="flex-1 relative flex flex-col overflow-hidden">
                        {/* Top Bar for Close and Title */}
                        <div className="flex items-center justify-between p-4 z-10">
                            <h2 className="text-gray-400 text-sm font-medium tracking-widest uppercase">Analyse de graphique</h2>
                            <button
                                className="text-white hover:text-gray-300 transition-all bg-gray-800/80 rounded-full p-2 border border-gray-700 hover:rotate-90"
                                onClick={() => setIsOpen(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Centered Image Viewport */}
                        <div className="flex-1 relative flex items-center justify-center p-4 md:p-8">
                            <div
                                ref={containerRef}
                                className={`relative max-h-full max-w-full overflow-hidden select-none shadow-2xl border border-gray-800 rounded-lg bg-gray-900 flex items-center justify-center ${activeTool === 'v' || activeTool === 'h' ? 'cursor-crosshair' : activeTool === 'loupe' ? 'cursor-none' : 'cursor-grab active:cursor-grabbing'}`}
                                onMouseDown={(e) => startDragOrPan(e)}
                                onClick={handleContainerClick}
                            >
                                <div style={{
                                    transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
                                    transition: isPanning ? 'none' : 'transform 0.2s ease-out',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: '100%'
                                }}>
                                    <img
                                        src={src}
                                        alt={alt}
                                        className="max-h-full max-w-full object-contain pointer-events-none"
                                        draggable={false}
                                        onLoad={(e) => {
                                            // Ensure container matches image aspect ratio if possible
                                            const img = e.currentTarget;
                                            if (containerRef.current) {
                                                // We don't want to force container size, but helps with loupe calculations
                                            }
                                        }}
                                    />

                                    {/* Guideline Tool Hint Overlay */}
                                    {(activeTool === 'v' || activeTool === 'h') && lines.length === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="bg-black/60 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-white/20 animate-pulse">
                                                Cliquez pour placer la ligne
                                            </div>
                                        </div>
                                    )}

                                    {/* Guidelines Overlay */}
                                    {lines.map(line => (
                                        <div
                                            key={line.id}
                                            onMouseDown={(e) => startDragOrPan(e, line.id)}
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
                                            <div className={`absolute ${line.type === 'v' ? 'left-1/2 top-0 bottom-0 w-[2px]' : 'top-1/2 left-0 right-0 h-[2px]'
                                                } ${line.type === 'v' ? 'bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-pink-400/80 shadow-[0_0_8px_rgba(244,114,182,0.5)]'}`}>
                                            </div>
                                            <button
                                                onClick={(e) => deleteLine(e, line.id)}
                                                className="absolute -top-6 -left-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-lg"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Loupe Effect - Constrained within the container boundary */}
                                {activeTool === 'loupe' && (
                                    <div
                                        className="absolute pointer-events-none rounded-full border-4 border-yellow-500 shadow-2xl overflow-hidden"
                                        style={{
                                            left: `${mousePos.x}%`,
                                            top: `${mousePos.y}%`,
                                            width: '200px',
                                            height: '200px',
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 100
                                        }}
                                    >
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            backgroundImage: `url(${src})`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundSize: `${100 * 3}% ${100 * 3}%`, // Perfect 3x zoom for axis reading
                                            backgroundPosition: `${mousePos.x}% ${mousePos.y}%`
                                        }}></div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                            <div className="w-full h-px bg-white"></div>
                                            <div className="h-full w-px bg-white absolute"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Tooltip */}
                        <div className="p-2 md:p-4 flex justify-center">
                            <div className="text-gray-400 text-xs bg-gray-900/60 px-6 py-2 rounded-full border border-gray-800 shadow-sm">
                                {activeTool === 'none'
                                    ? "Mode Navigation : Glissez pour déplacer le graphique"
                                    : activeTool === 'loupe'
                                        ? "Loupe Active (3x) : Survoler les graduations pour zoomer"
                                        : `Outil Ligne ${activeTool === 'v' ? 'V' : 'H'} : Cliquez sur le graphique pour placer`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ImageZoom;
