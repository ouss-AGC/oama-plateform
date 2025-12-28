import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, MoveHorizontal, MoveVertical, Trash2, MousePointer2, HelpCircle, ShieldCheck } from 'lucide-react';

interface Guideline {
    id: number;
    position: number; // Percentage (0-100)
    type: 'h' | 'v';
    color?: string;
    isLocked?: boolean;
}

interface ImageZoomProps {
    src: string;
    alt: string;
    className?: string; // Prop optional
    lines: Guideline[];
    onLinesChange: (lines: Guideline[]) => void;
}

const COLORS = [
    { name: 'Cyan', value: '#22d3ee' },
    { name: 'Rose', value: '#f472b6' },
    { name: 'Vert', value: '#4ade80' },
    { name: 'Jaune', value: '#facc15' },
    { name: 'Orange', value: '#fb923c' },
    { name: 'Rouge', value: '#ef4444' },
    { name: 'Blanc', value: '#ffffff' }
];

const ImageZoom: React.FC<ImageZoomProps> = ({ src, alt, className, lines, onLinesChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTool, setActiveTool] = useState<'none' | 'h' | 'v' | 'loupe'>('none');
    const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showHelp, setShowHelp] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [loupeCoords, setLoupeCoords] = useState({ x: 0, y: 0, bgX: 0, bgY: 0 });

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
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
            position: activeTool === 'v' ? x : y,
            color: selectedColor,
            isLocked: false
        };

        onLinesChange([...lines, newLine]);
    };

    const deleteLine = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        onLinesChange(lines.filter(l => l.id !== id));
    };

    const toggleLock = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        onLinesChange(lines.map(l => l.id === id ? { ...l, isLocked: !l.isLocked } : l));
    };

    const startDragOrPan = (e: React.MouseEvent, id?: number) => {
        e.stopPropagation();
        if (id !== undefined) {
            const line = lines.find(l => l.id === id);
            if (line && !line.isLocked) {
                setDraggingId(id);
            }
        } else if (activeTool === 'none') {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
        const relativeY = ((e.clientY - rect.top) / rect.height) * 100;

        // Update mouse pos for lines and hints
        setMousePos({ x: relativeX, y: relativeY });

        // Accurate Loupe Pixel Calculations
        if (activeTool === 'loupe' && imgRef.current) {
            const imgRect = imgRef.current.getBoundingClientRect();

            // Cursor position relative to the image element (in pixels)
            const posX = e.clientX - imgRect.left;
            const posY = e.clientY - imgRect.top;

            // Background position for the 3x zoom
            const bgX = (posX * 3) - 130;
            const bgY = (posY * 3) - 130;

            setLoupeCoords({
                x: relativeX,
                y: relativeY,
                bgX: bgX,
                bgY: bgY
            });
        }

        if (draggingId !== null) {
            const line = lines.find(l => l.id === draggingId);
            if (!line || line.isLocked) return;

            let newPos = 0;
            if (line.type === 'v') {
                newPos = relativeX;
            } else {
                newPos = relativeY;
            }

            newPos = Math.max(0, Math.min(100, newPos));
            onLinesChange(lines.map(l => l.id === draggingId ? { ...l, position: newPos } : l));
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
                className={`relative group cursor-pointer inline-block ${className || ''}`}
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
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all w-16 h-16 ${activeTool === 'v' ? 'shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            style={{ backgroundColor: activeTool === 'v' ? selectedColor : 'transparent', color: activeTool === 'v' ? (selectedColor === '#ffffff' ? '#000' : '#fff') : '' }}
                            title="Ligne Verticale"
                        >
                            <MoveVertical size={24} />
                            <span className="text-[10px] font-bold mt-1 uppercase">Ligne V</span>
                        </button>

                        <button
                            onClick={() => setActiveTool('h')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all w-16 h-16 ${activeTool === 'h' ? 'shadow-lg shadow-pink-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            style={{ backgroundColor: activeTool === 'h' ? selectedColor : 'transparent', color: activeTool === 'h' ? (selectedColor === '#ffffff' ? '#000' : '#fff') : '' }}
                            title="Ligne Horizontale"
                        >
                            <MoveHorizontal size={24} />
                            <span className="text-[10px] font-bold mt-1 uppercase">Ligne H</span>
                        </button>

                        {/* Color Palette */}
                        <div className="flex flex-wrap justify-center gap-1.5 px-2 py-2 bg-gray-800/50 rounded-xl border border-gray-700">
                            {COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setSelectedColor(c.value)}
                                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${selectedColor === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>

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
                            onClick={() => setShowHelp(!showHelp)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all w-16 h-16 ${showHelp ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:bg-indigo-900/40'}`}
                            title="Aide"
                        >
                            <HelpCircle size={24} />
                            <span className="text-[10px] font-bold mt-1 uppercase">Aide</span>
                        </button>

                        <button
                            onClick={() => { onLinesChange([]); setScale(1); setOffset({ x: 0, y: 0 }); }}
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
                            <h2 className="text-gray-400 text-sm font-medium tracking-widest uppercase font-mono">Analyse de graphique tactique</h2>
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
                                        ref={imgRef}
                                        src={src}
                                        alt={alt}
                                        className="max-h-full max-w-full object-contain pointer-events-none"
                                        draggable={false}
                                    />

                                    {/* Guideline Tool Hint Overlay */}
                                    {(activeTool === 'v' || activeTool === 'h') && lines.length === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="bg-black/60 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-white/20 animate-pulse font-mono text-sm uppercase tracking-tighter">
                                                Placer le guide sur le graphique
                                            </div>
                                        </div>
                                    )}

                                    {/* Guidelines Overlay */}
                                    {lines.map(line => (
                                        <div
                                            key={line.id}
                                            onMouseDown={(e) => startDragOrPan(e, line.id)}
                                            className={`absolute group transition-shadow hover:shadow-lg ${line.type === 'v'
                                                ? 'top-0 bottom-0 w-4 -ml-2 cursor-col-resize'
                                                : 'left-0 right-0 h-4 -mt-2 cursor-row-resize'
                                                }`}
                                            style={{
                                                left: line.type === 'v' ? `${line.position}%` : 0,
                                                top: line.type === 'h' ? `${line.position}%` : 0,
                                                zIndex: draggingId === line.id ? 20 : 10
                                            }}
                                        >
                                            <div className={`absolute ${line.type === 'v' ? 'left-1/2 top-0 bottom-0 w-[2px]' : 'top-1/2 left-0 right-0 h-[2px]'
                                                }`} style={{ backgroundColor: line.color || '#22d3ee', boxShadow: `0 0 10px ${line.color || '#22d3ee'}80` }}>
                                            </div>

                                            {/* Line Controls Overlay */}
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                                <button
                                                    onClick={(e) => toggleLock(e, line.id)}
                                                    className={`p-2 rounded-lg shadow-xl border transition-all ${line.isLocked ? 'bg-orange-600 text-white border-orange-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'}`}
                                                    title={line.isLocked ? "Déverrouiller" : "Figer la ligne (Verrouiller)"}
                                                >
                                                    <ShieldCheck size={16} />
                                                </button>
                                                {!line.isLocked && (
                                                    <button
                                                        onClick={(e) => deleteLine(e, line.id)}
                                                        className="p-2 bg-red-600/90 text-white rounded-lg transition-all shadow-xl border border-red-500 hover:bg-red-500"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {line.isLocked && (
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1">
                                                    <ShieldCheck size={12} className="text-orange-500 drop-shadow-md" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Loupe Effect */}
                                {activeTool === 'loupe' && imgRef.current && (
                                    <div
                                        className="absolute pointer-events-none rounded-full border-4 border-yellow-500 shadow-2xl overflow-hidden bg-gray-900"
                                        style={{
                                            left: `${loupeCoords.x}%`,
                                            top: `${loupeCoords.y}%`,
                                            width: '260px',
                                            height: '260px',
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 100
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            width: `${imgRef.current.offsetWidth * 3}px`,
                                            height: `${imgRef.current.offsetHeight * 3}px`,
                                            left: `-${loupeCoords.bgX}px`,
                                            top: `-${loupeCoords.bgY}px`,
                                        }}>
                                            <img
                                                src={src}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                alt="zoomed"
                                            />

                                            {lines.map(line => (
                                                <div
                                                    key={`loupe-line-${line.id}`}
                                                    className="absolute"
                                                    style={{
                                                        left: line.type === 'v' ? `${line.position}%` : 0,
                                                        top: line.type === 'h' ? `${line.position}%` : 0,
                                                        width: line.type === 'v' ? '2.5px' : '100%',
                                                        height: line.type === 'h' ? '2.5px' : '100%',
                                                        backgroundColor: line.color || '#22d3ee',
                                                        boxShadow: `0 0 8px ${line.color || '#22d3ee'}A0`,
                                                        zIndex: 10
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {/* Reticle */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-40">
                                            <div className="w-full h-px bg-white"></div>
                                            <div className="h-full w-px bg-white absolute"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Tooltip */}
                        <div className="p-2 md:p-4 flex justify-center">
                            <div className="text-cyan-400 text-xs bg-slate-900/80 px-8 py-2.5 rounded-full border border-cyan-900/50 shadow-2xl backdrop-blur-md font-mono uppercase tracking-widest">
                                {activeTool === 'none'
                                    ? "Navigation • Vos tracés sont persistants"
                                    : activeTool === 'loupe'
                                        ? "Précision XL (3x) • Idéal pour les abaques de Baker"
                                        : `Guide ${activeTool === 'v' ? 'Vertical' : 'Horizontal'} • Cliquez pour poser • Palette pour la couleur`
                                }
                            </div>
                        </div>
                    </div>

                    {/* Interactive Help Overlay */}
                    {showHelp && (
                        <div className="absolute inset-0 z-[110] flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                            <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-10 max-w-3xl shadow-[0_0_100px_rgba(34,211,238,0.15)] relative">
                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full"
                                >
                                    <X size={24} />
                                </button>

                                <div className="flex items-center space-x-4 mb-8">
                                    <div className="bg-indigo-600/20 p-3 rounded-2xl border border-indigo-500/30">
                                        <HelpCircle className="text-indigo-400" size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter font-mono">Manuel d'Analyse Graphique</h3>
                                        <p className="text-indigo-400 text-xs font-mono tracking-widest uppercase mt-1">Protocole d'expertise structurelle</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="flex items-start space-x-4">
                                            <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-500/30 text-blue-400 shrink-0"><MousePointer2 size={20} /></div>
                                            <div>
                                                <p className="font-bold text-white text-base">Persistence Totale</p>
                                                <p className="text-slate-400 text-xs leading-relaxed">Vos tracés ne sont **jamais effacés** lors de la fermeture de la fenêtre. Ils restent liés au graphique pour toute la durée de l'examen.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-4">
                                            <div className="bg-cyan-500/20 p-2.5 rounded-xl border border-cyan-500/30 text-cyan-400 shrink-0"><MoveVertical size={20} /></div>
                                            <div>
                                                <p className="font-bold text-white text-base">Codification Couleur</p>
                                                <p className="text-slate-400 text-xs leading-relaxed">Utilisez la palette latérale pour changer de couleur. Utile pour séparer les étapes de calcul (ex: Zₐ en Cyan, Pₛ₀ en Rose).</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex items-start space-x-4">
                                            <div className="bg-orange-600/20 p-2.5 rounded-xl border border-orange-500/30 text-orange-500 shrink-0"><ShieldCheck size={20} /></div>
                                            <div>
                                                <p className="font-bold text-white text-base">Verrouillage de Preuve</p>
                                                <p className="text-slate-400 text-xs leading-relaxed">Une fois votre ligne posée, cliquez sur 🔒 pour la **figer**. Elle laisse une trace immuable de votre raisonnement sur l'abaque.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-4">
                                            <div className="bg-yellow-500/20 p-2.5 rounded-xl border border-yellow-500/30 text-yellow-500 shrink-0"><ZoomIn size={20} /></div>
                                            <div>
                                                <p className="font-bold text-white text-base">Lecture au ms & kPa</p>
                                                <p className="text-slate-400 text-xs leading-relaxed">La loupe XL (3x) est l'outil indispensable pour relever des valeurs précises sur les échelles logarithmiques de Baker.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col items-center space-y-6">
                                    <p className="text-slate-500 text-[11px] text-center max-w-lg leading-relaxed font-mono">
                                        Note: Les tracés verrouillés sont visibles lors de la revue admin par l'Assistant Professor Atoui Oussama pour valider votre méthodologie.
                                    </p>
                                    <button
                                        onClick={() => setShowHelp(false)}
                                        className="px-16 py-4 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-[0.2em] text-sm shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-95"
                                    >
                                        RETOUR AU CALCUL
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ImageZoom;
