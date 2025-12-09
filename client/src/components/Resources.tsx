import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Video, FileText, ExternalLink, CheckCircle, Play, Award } from 'lucide-react';

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
    category?: string;
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
                        onClick={() => navigate('/', { state: { skipIntro: true } })}
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
                        {/* Motivational Banner */}
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 border-2 border-purple-400 shadow-2xl">
                            <div className="flex items-center mb-3">
                                <Award className="w-8 h-8 text-yellow-300 mr-3" />
                                <h2 className="text-2xl font-bold text-white">Préparez-vous pour Réussir ! 🎯</h2>
                            </div>
                            <p className="text-white text-lg mb-4">
                                Consultez ces ressources pour maximiser vos chances de succès au quiz officiel.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                                    <Video className="w-6 h-6 text-yellow-300 mx-auto mb-2" />
                                    <p className="text-white font-semibold">{resources.videos.length} Vidéos</p>
                                    <p className="text-gray-200 text-sm">Explications détaillées</p>
                                </div>
                                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                                    <FileText className="w-6 h-6 text-yellow-300 mx-auto mb-2" />
                                    <p className="text-white font-semibold">{resources.practiceExams.length} Devoir</p>
                                    <p className="text-gray-200 text-sm">Avec corrections</p>
                                </div>
                                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                                    <CheckCircle className="w-6 h-6 text-green-300 mx-auto mb-2" />
                                    <p className="text-white font-semibold">100% Gratuit</p>
                                    <p className="text-gray-200 text-sm">Accès illimité</p>
                                </div>
                            </div>
                        </div>

                        {/* Videos Section - Priority */}
                        <section className="bg-gradient-to-br from-red-900 to-red-700 bg-opacity-20 backdrop-blur-md rounded-xl p-6 border-2 border-red-500 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-white flex items-center">
                                    <Play className="w-8 h-8 mr-3 text-red-400 animate-pulse" />
                                    Animations 3D Didactiques
                                </h2>
                                <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                                    À VOIR ABSOLUMENT
                                </span>
                            </div>
                            <p className="text-gray-200 mb-6 text-lg">
                                🎬 Visualisations 3D pour comprendre le fonctionnement des différents types de munitions vus en classe.
                            </p>

                            {resources.videos.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {resources.videos.map((video, index) => (
                                        <div key={video.id} className="bg-gray-900 bg-opacity-70 rounded-xl p-5 border-2 border-gray-700 hover:border-red-400 transition-all transform hover:scale-105 shadow-lg">
                                            <div className="flex items-start mb-4">
                                                <div className="bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mr-3 flex-shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    {video.category && (
                                                        <span className="text-xs text-red-400 font-semibold">{video.category}</span>
                                                    )}
                                                    <h3 className="text-xl font-bold text-white mb-1">{video.title}</h3>
                                                    <span className="text-xs text-gray-400 flex items-center">
                                                        <Video className="w-3 h-3 mr-1" />
                                                        {video.duration}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-gray-300 text-sm mb-4">{video.description}</p>
                                            <a
                                                href={video.videoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all font-bold shadow-lg"
                                            >
                                                <Play className="w-5 h-5 mr-2" />
                                                Regarder Maintenant
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">Aucune vidéo disponible pour le moment.</p>
                            )}
                        </section>

                        {/* Practice Exams Section */}
                        <section className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-gray-600">
                            <h2 className="text-2xl font-bold text-military-beige mb-4 flex items-center">
                                <FileText className="w-6 h-6 mr-2" />
                                Devoir de Contrôle avec Correction
                            </h2>
                            <p className="text-gray-300 mb-6">
                                📄 Consultez le devoir avec sa correction pour vous entraîner.
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
                                            <div className="w-full h-[800px] bg-white rounded-lg overflow-hidden shadow-xl">
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

                        {/* Call to Action */}
                        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 border-2 border-green-400 shadow-2xl text-center">
                            <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-white mb-3">Prêt à Tester Vos Connaissances ?</h3>
                            <p className="text-white mb-6 text-lg">
                                Après avoir consulté ces ressources, passez au test d'évaluation (pratique) pour vous entraîner, puis au quiz officiel !
                            </p>
                            <button
                                onClick={() => navigate('/', { state: { skipIntro: true } })}
                                className="px-8 py-4 bg-white text-green-700 rounded-full font-bold text-lg hover:bg-gray-100 transition-all shadow-lg transform hover:scale-105"
                            >
                                Retour aux Quiz →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Resources;

