import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Home, Award, Trophy, AlertTriangle } from 'lucide-react';
import { generateCertificate, generateVisualCertificate } from '../utils/certificateGenerator';

interface QuizResult {
    student: {
        name: string;
        grade: string;
        className: string;
        matricule: string;
    };
    score: number;
    scoreOn20: number;
    correctCount: number;
    totalQuestions: number;
    timeElapsed: number;
    discipline: string;
    timestamp: number;
}

const Results: React.FC = () => {
    const navigate = useNavigate();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [visualCertificate, setVisualCertificate] = useState<string>('');

    useEffect(() => {
        const loadResult = async () => {
            const lastResult = localStorage.getItem('lastQuizResult');
            if (!lastResult) {
                navigate('/');
                return;
            }
            const parsedResult = JSON.parse(lastResult);
            setResult(parsedResult);

            // Generate visual certificate for scores ≤ 15
            if (parsedResult.scoreOn20 <= 15) {
                const certImage = await generateVisualCertificate(parsedResult);
                setVisualCertificate(certImage);
            }
        };

        loadResult();
    }, [navigate]);

    if (!result) return null;

    const getMedal = () => {
        if (result.scoreOn20 >= 18) return { icon: <Trophy className="w-16 h-16 text-yellow-500" />, text: "Or", color: "text-yellow-500" };
        if (result.scoreOn20 >= 16) return { icon: <Trophy className="w-16 h-16 text-gray-400" />, text: "Argent", color: "text-gray-400" };
        if (result.scoreOn20 >= 14) return { icon: <Trophy className="w-16 h-16 text-orange-600" />, text: "Bronze", color: "text-orange-600" };
        return null;
    };

    const medal = getMedal();
    const isPass = result.scoreOn20 >= 10;
    const canDownloadCertificate = result.scoreOn20 > 15;

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
            style={{ backgroundImage: "url('/academy-bg.png')", backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(255,255,255,0.9)' }}>

            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all hover:scale-[1.01]">
                <div className={`p-8 text-center ${isPass ? 'bg-military-green' : 'bg-red-600'} text-white`}>
                    {medal ? (
                        <div className="flex justify-center mb-4 animate-bounce">
                            {medal.icon}
                        </div>
                    ) : (
                        <div className="flex justify-center mb-4">
                            {isPass ? <Award className="w-16 h-16" /> : <AlertTriangle className="w-16 h-16" />}
                        </div>
                    )}

                    <h1 className="text-4xl font-bold mb-2">
                        {isPass ? "Félicitations !" : "Échec"}
                    </h1>
                    <p className="text-xl opacity-90">
                        {isPass ? "Vous avez réussi l'évaluation." : "Vous n'avez pas atteint le score minimum."}
                    </p>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-gray-500 text-sm uppercase tracking-wide">Score Final</p>
                            <p className={`text-3xl font-bold ${isPass ? 'text-military-green' : 'text-red-600'}`}>
                                {result.scoreOn20.toFixed(1)}/20
                            </p>
                            <p className="text-sm text-gray-400">{result.correctCount} sur {result.totalQuestions} correctes</p>
                        </div>

                        <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-gray-500 text-sm uppercase tracking-wide">Temps</p>
                            <p className="text-3xl font-bold text-gray-800">
                                {Math.floor(result.timeElapsed / 60)}:{(result.timeElapsed % 60).toString().padStart(2, '0')}
                            </p>
                            <p className="text-sm text-gray-400">minutes</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-gray-600">Nom</span>
                            <span className="font-semibold">{result.student.grade} {result.student.name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-gray-600">Classe</span>
                            <span className="font-semibold">{result.student.className}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-gray-600">Matricule</span>
                            <span className="font-semibold">{result.student.matricule}</span>
                        </div>
                    </div>

                    {/* Encouraging message for students who failed (< 10/20) */}
                    {!isPass && (
                        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-6 shadow-md">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <div className="ml-4 flex-1">
                                    <h3 className="text-lg font-bold text-blue-900 mb-3">
                                        Message d'Encouragement
                                    </h3>
                                    <div className="text-blue-800 space-y-3">
                                        <p className="leading-relaxed">
                                            <strong>Ne vous découragez pas !</strong> L'apprentissage est un processus continu et chaque évaluation est une opportunité de progresser.
                                        </p>
                                        <p className="leading-relaxed">
                                            Votre score actuel de <strong>{result.scoreOn20.toFixed(1)}/20</strong> indique que vous devez approfondir vos connaissances dans cette matière.
                                        </p>
                                        <div className="bg-white bg-opacity-60 rounded-lg p-4 mt-4">
                                            <p className="font-semibold text-blue-900 mb-2">📚 Recommandations :</p>
                                            <ul className="list-disc list-inside space-y-2 text-sm">
                                                <li>Revoyez attentivement le cours et vos notes</li>
                                                <li>Identifiez les sujets où vous avez eu des difficultés</li>
                                                <li>Consultez <strong>Lt Col Oussama Atoui</strong>, votre instructeur Armes et Munitions</li>
                                                <li>Demandez des explications détaillées sur vos réponses incorrectes</li>
                                                <li>Pratiquez avec des exercices supplémentaires</li>
                                                <li>N'hésitez pas à poser des questions en classe</li>
                                            </ul>
                                        </div>
                                        <p className="leading-relaxed font-semibold text-blue-900 mt-4">
                                            💪 Vous avez les capacités de réussir ! Avec du travail et de la détermination, vous améliorerez certainement vos résultats.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Visual Certificate for scores ≤ 15 */}
                    {isPass && !canDownloadCertificate && visualCertificate && (
                        <div className="mt-8">
                            <h3 className="text-center text-lg font-bold text-gray-700 mb-4">Votre Certificat</h3>
                            <div className="border-4 border-military-green rounded-lg overflow-hidden">
                                <img src={visualCertificate} alt="Certificat" className="w-full" />
                            </div>
                            <p className="text-center text-sm text-gray-500 mt-2">
                                Certificat visuel - Score: {result.scoreOn20.toFixed(1)}/20
                            </p>
                        </div>
                    )}

                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 flex items-center justify-center transition-colors"
                        >
                            <Home className="w-5 h-5 mr-2" />
                            Retour à l'accueil
                        </button>

                        {/* Download button only for scores > 15 */}
                        {isPass && canDownloadCertificate && (
                            <button
                                onClick={() => generateCertificate(result)}
                                className="px-6 py-3 rounded-lg bg-military-beige text-military-green font-bold hover:bg-yellow-200 flex items-center justify-center shadow-md transition-colors"
                            >
                                <Download className="w-5 h-5 mr-2" />
                                Télécharger Certificat
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Results;
