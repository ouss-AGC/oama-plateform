import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageZoomProps {
    src: string;
    alt: string;
    className?: string;
}

const ImageZoom: React.FC<ImageZoomProps> = ({ src, alt, className }) => {
    const [isOpen, setIsOpen] = useState(false);

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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-gray-800 rounded-full p-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={src}
                        alt={alt}
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded-md shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};

export default ImageZoom;
