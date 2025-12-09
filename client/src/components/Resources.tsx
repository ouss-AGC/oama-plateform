import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Video, FileText, Download, ExternalLink } from 'lucide-react';

interface PracticeExam {
    id: number;
    title: string;
    description: string;
    fileUrl: string;
    date: string;
}

interface VideoResource {
    id: number;
    title: string;
    description: string;
    videoUrl: string;
    duration: string;
}

interface ResourcesData {
    practiceExams: PracticeExam[];
    videos: VideoResource[];
}

const Resources: React.FC = () => {
    const navigate = useNavigate();
    const [resources, setResources] = useState<ResourcesData>({ practiceExams: [], videos: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const response = await fetch('/munitions_resources.json');
                const data = await response.json();
                setResources(data);
            } catch (error) {
                console.error('Failed to load resources:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    }, []);

    return (
        <div className="min-h-screen bg-gray-900"
            style={{ backgroundImage: "url('/academy-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-black bg-opacity-80"></div>

            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-military-beige hover:text-white transition-colors mr-4"
                    >
                        <ArrowLeft className="w-6 h-6 mr-2" />
                        Retour
                    </button>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                        <BookOpen className="inline-block w-8 h-8 mr-3 text-military-beige" />
                        Ressources - Généralités sur les Munitions
                    </h1>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-military-beige mx-auto"></div>
                        <p className="mt-4 text-gray-300">Chargement des ressources...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Practice Exams Section */}
                        <section className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-gray-600">
                            <h2 className="text-2xl font-bold text-military-beige mb-4 flex items-center">
                                <FileText className="w-6 h-6 mr-2" />
                                Devoirs de Contrôle avec Corrections
                            </h2>
                            <p className="text-gray-300 mb-6">
                                Consultez les devoirs de contrôle avec leurs corrections pour vous préparer au quiz.
                            </p>

                            {resources.practiceExams.length > 0 ? (
                                <div className="space-y-6">
                                    {resources.practiceExams.map((exam) => (
                                        <div key={exam.id} className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
                                            <div className="mb-4">
                                                <h3 className="text-xl font-semibold text-white mb-2">{exam.title}</h3>
                                                <p className="text-gray-400 text-sm mb-1">{exam.description}</p>
                                                <span className="text-xs text-gray-500">{new Date(exam.date).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                            {/* Embedded PDF Viewer */}
                                            <div className="w-full h-[800px] bg-white rounded-lg overflow-hidden">
                                                <iframe
                                                    src={exam.fileUrl}
                                                    className="w-full h-full"
                                                    title={exam.title}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">Aucun devoir disponible pour le moment.</p>
                            )}
                        </section>

                        {/* Videos Section */}
                        <section className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-gray-600">
                            <h2 className="text-2xl font-bold text-military-beige mb-4 flex items-center">
                                <Video className="w-6 h-6 mr-2" />
                                Vidéos Explicatives
                            </h2>
                            <p className="text-gray-300 mb-6">
                                Regardez les vidéos explicatives des chapitres vus en classe.
                            </p>

                            {resources.videos.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {resources.videos.map((video) => (
                                        <div key={video.id} className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700 hover:border-military-beige transition-colors">
                                            <div className="flex items-start mb-3">
                                                <div className="bg-military-green bg-opacity-20 p-2 rounded-lg mr-3">
                                                    <Video className="w-6 h-6 text-military-beige" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-white mb-1">{video.title}</h3>
                                                    <span className="text-xs text-gray-500">{video.duration}</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-3">{video.description}</p>
                                            <a
                                                href={video.videoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                Regarder la vidéo
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">Aucune vidéo disponible pour le moment.</p>
                            )}
                        </section>

                        {/* Info Box */}
                        <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
                            <p className="text-blue-200 text-sm">
                                💡 <strong>Conseil :</strong> Consultez ces ressources avant de passer le test d'évaluation (pratique) pour mieux vous préparer au quiz officiel.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Resources;
