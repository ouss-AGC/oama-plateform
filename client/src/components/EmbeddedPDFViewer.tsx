import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker (reusing the configuration from ExamPDFViewer)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface EmbeddedPDFViewerProps {
    pdfUrl: string;
    className?: string;
    defaultScale?: number;
}

const EmbeddedPDFViewer: React.FC<EmbeddedPDFViewerProps> = ({ pdfUrl, className = "", defaultScale = 0.65 }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(defaultScale);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const changePage = (offset: number) => {
        setPageNumber(prevPageNumber => Math.min(Math.max(1, prevPageNumber + offset), numPages || 1));
    };

    return (
        <div className={`flex flex-col bg-slate-100 rounded-xl border border-gray-200 overflow-hidden shadow-sm ${className}`}>
            {/* Header Controls */}
            <div className="flex justify-between items-center p-2 bg-slate-800 text-white">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <span className="text-xs font-mono min-w-[3ch] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={() => setScale(s => Math.min(2.0, s + 0.1))}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn size={16} />
                    </button>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Document de Référence
                </span>
            </div>

            {/* Document Render Area */}
            <div className="flex-grow overflow-auto bg-slate-500/10 p-4 flex justify-center" onContextMenu={(e) => e.preventDefault()}>
                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex flex-col items-center"
                    loading={<div className="text-gray-500 animate-pulse">Chargement...</div>}
                    error={<div className="text-red-500 text-sm p-4">Erreur de chargement du PDF via {pdfUrl}</div>}
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-xl"
                    />
                </Document>
            </div>

            {/* Footer Navigation */}
            <div className="p-2 bg-white border-t border-gray-200 flex justify-center items-center space-x-4">
                <button
                    disabled={pageNumber <= 1}
                    onClick={() => changePage(-1)}
                    className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 text-slate-700 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>

                <span className="text-sm font-medium text-slate-600">
                    {pageNumber} / {numPages || '--'}
                </span>

                <button
                    disabled={pageNumber >= (numPages || 1)}
                    onClick={() => changePage(1)}
                    className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 text-slate-700 transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default EmbeddedPDFViewer;
