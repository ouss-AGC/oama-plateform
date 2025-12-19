import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ExamPDFViewerProps {
    pdfUrl: string;
    isOpen: boolean;
    onClose: () => void;
    studentName?: string;
}

const ExamPDFViewer: React.FC<ExamPDFViewerProps> = ({ pdfUrl, isOpen, onClose, studentName }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    if (!isOpen) return null;

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const changePage = (offset: number) => {
        setPageNumber(prevPageNumber => Math.min(Math.max(1, prevPageNumber + offset), numPages || 1));
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 animate-in fade-in duration-200 select-none"
            onClick={onClose}
            onDragStart={(e) => e.preventDefault()}
        >
            <div
                className="bg-slate-900 rounded-lg shadow-xl w-[95vw] h-[95vh] flex flex-col overflow-hidden border border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
                    <h2 className="text-white font-semibold text-lg">Sujet d'Examen</h2>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-slate-700 rounded-lg p-1">
                            <button
                                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                                className="p-1 hover:bg-slate-600 rounded text-gray-300"
                            >
                                <ZoomOut size={20} />
                            </button>
                            <span className="text-gray-300 text-sm min-w-[3ch] text-center">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={() => setScale(s => Math.min(2.0, s + 0.1))}
                                className="p-1 hover:bg-slate-600 rounded text-gray-300"
                            >
                                <ZoomIn size={20} />
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto flex justify-center p-4 bg-slate-900/50" onContextMenu={(e) => e.preventDefault()}>
                    <div className="relative group">
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className="flex flex-col items-center"
                            loading={<div className="text-white">Chargement du sujet...</div>}
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="shadow-2xl mb-4"
                            />
                        </Document>
                        {/* Security Watermark Overlay */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] select-none flex items-center justify-center rotate-[-45deg]">
                            <div className="text-9xl font-black whitespace-nowrap uppercase">
                                {studentName || 'PROPRIÉTÉ OAMA'} - NE PAS DIFFUSER
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-center items-center space-x-4">
                    <button
                        disabled={pageNumber <= 1}
                        onClick={() => changePage(-1)}
                        className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-50 text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <span className="text-gray-300">
                        Page {pageNumber} sur {numPages || '--'}
                    </span>

                    <button
                        disabled={pageNumber >= (numPages || 1)}
                        onClick={() => changePage(1)}
                        className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-50 text-white transition-colors"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamPDFViewer;
