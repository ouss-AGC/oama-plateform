import React, { useEffect, useState } from 'react';
import { generateVisualCertificate } from '../utils/certificateGenerator';
import { ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CertificatePreview: React.FC = () => {
    const navigate = useNavigate();
    const [certImages, setCertImages] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const generatePreviews = async () => {
            const disciplines = [
                { code: 'munitions', name: 'Généralités Munitions' },
                { code: 'agc', name: 'Armement Gros Calibre' },
                { code: 'genie', name: 'Génie Militaire' }
            ];

            const images: { [key: string]: string } = {};

            for (const disc of disciplines) {
                const dummyResult = {
                    student: {
                        name: "Jean Dupont",
                        grade: "Sgt",
                        className: "B1",
                        matricule: "12345"
                    },
                    score: 18,
                    scoreOn20: 18,
                    discipline: disc.code,
                    timestamp: Date.now()
                };

                // @ts-ignore
                images[disc.code] = await generateVisualCertificate(dummyResult);
            }

            setCertImages(images);
            setLoading(false);
        };

        generatePreviews();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center mb-8">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Aperçu des Certificats</h1>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-military-green mx-auto"></div>
                        <p className="mt-4 text-gray-600">Génération des aperçus...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-12">
                        {/* Munitions */}
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-bold text-military-green mb-4 border-b pb-2">1. Généralités sur les Munitions</h2>
                            <img src={certImages['munitions']} alt="Certificat Munitions" className="w-full shadow-md border border-gray-200" />
                        </div>

                        {/* AGC */}
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-bold text-military-green mb-4 border-b pb-2">2. Armement Gros Calibre (AGC)</h2>
                            <img src={certImages['agc']} alt="Certificat AGC" className="w-full shadow-md border border-gray-200" />
                        </div>

                        {/* Genie */}
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-bold text-military-green mb-4 border-b pb-2">3. Génie Militaire (Fallback / Munitions Style)</h2>
                            <img src={certImages['genie']} alt="Certificat Génie" className="w-full shadow-md border border-gray-200" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CertificatePreview;
