import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Home, Award, Trophy, AlertTriangle, BarChart as BarChartIcon, FileText, BookOpen, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { generateCertificate, generateVisualCertificate } from '../utils/certificateGenerator';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface Question {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
}

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
    answers: number[];
}

const Results: React.FC = () => {
    const navigate = useNavigate();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [visualCertificate, setVisualCertificate] = useState<string>('');
    const [classStats, setClassStats] = useState({ average: 0, max: 0, min: 0 });
    const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);

    useEffect(() => {
        const loadResult = async () => {
            const lastResult = localStorage.getItem('lastQuizResult');
            if (!lastResult) {
                navigate('/');
                return;
            }
            const parsedResult = JSON.parse(lastResult);
            setResult(parsedResult);

            // Fetch Class Stats
            try {
                const statsRes = await fetch(`/api/stats?discipline=${parsedResult.discipline}`);
                const statsData = await statsRes.json();
                setClassStats(statsData);
            } catch (error) {
                console.error("Failed to load class stats:", error);
            }

            // Fetch Questions for Report
            try {
                const questionsRes = await fetch(`/quiz_data_${parsedResult.discipline}.json`);
                const questionsData = await questionsRes.json();
                setQuizQuestions(questionsData.questions);
            } catch (error) {
                console.error("Failed to load questions:", error);
            }

            // Generate visual certificate for scores <= 15
            if (parsedResult.scoreOn20 <= 15) {
                const certImage = await generateVisualCertificate(parsedResult);
                setVisualCertificate(certImage);
            }
        };

        loadResult();
    }, [navigate]);

    const generateReport = async () => {
        if (!result) return;
        const doc = new jsPDF();

        // Load signature image
        const loadImage = (src: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } else {
                        reject(new Error('Canvas context not available'));
                    }
                };
                img.onerror = reject;
                img.src = src;
            });
        };

        let signatureDataUrl = '';
        try {
            signatureDataUrl = await loadImage('/signature.png');
        } catch (err) {
            console.error('Failed to load signature:', err);
        }

        // Load score circle image
        let scoreCircleDataUrl = '';
        let stampDataUrl = '';
        try {
            scoreCircleDataUrl = await loadImage('/score_circle.png');
            stampDataUrl = await loadImage('/golden_stamp_pdf.png'); // PDF-specific stamp
        } catch (err) {
            console.error('Failed to load assets:', err);
        }

        // Header with handwritten score circle and signature
        doc.setFontSize(22);
        doc.setTextColor(45, 80, 22);
        doc.text("RAPPORT INDIVIDUEL", 105, 20, { align: "center" });

        // Large RED handwritten score at TOP RIGHT with Circle Image
        if (scoreCircleDataUrl) {
            doc.addImage(scoreCircleDataUrl, 'PNG', 160, 15, 40, 40);
        }

        doc.setFontSize(22); // Slightly smaller to fit in circle
        doc.setFont("times", "italic"); // Handwritten style
        doc.setTextColor(200, 0, 0); // Red
        // Position text roughly in the center/left of the circle image (160 + 15, 15 + 25)
        doc.text(`${result.scoreOn20.toFixed(1)}/20`, 180, 42, { align: "center", angle: 15 }); // Added slight angle for handwritten feel

        // Add signature on the left (Larger for visibility)
        if (signatureDataUrl) {
            doc.addImage(signatureDataUrl, 'PNG', 20, 25, 75, 38); // 50% larger
        }

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("Lt Col Oussama Atoui", 57, 66, { align: "center" }); // Directly under signature
        doc.text("Instructeur Armes et Munitions", 57, 70, { align: "center" });

        // Add Golden Stamp (Right side, below score circle)
        if (stampDataUrl) {
            doc.addImage(stampDataUrl, 'PNG', 155, 60, 50, 50); // Right side, larger, below score
        }

        // Student information
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(200, 0, 0); // Red Name
        doc.text(`Nom: ${result.student.grade} ${result.student.name}`, 20, 70);

        doc.setTextColor(0); // Reset to black
        doc.setFont("helvetica", "normal");
        doc.text(`Classe: ${result.student.className}`, 20, 78);
        doc.text(`Matricule: ${result.student.matricule}`, 20, 86);

        doc.text(`Discipline: ${result.discipline.toUpperCase()}`, 140, 70);
        doc.text(`Score: ${result.scoreOn20.toFixed(2)}/20`, 140, 78);
        doc.text(`Date: ${new Date(result.timestamp).toLocaleDateString()}`, 140, 86);

        let yPos = 100;
        doc.setFontSize(16);
        doc.text("Détail des réponses", 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        quizQuestions.forEach((q, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            const userAnswer = result.answers[index];
            const isCorrect = userAnswer === q.correctAnswer;

            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(`Q${index + 1}: ${q.question}`, 20, yPos, { maxWidth: 170 });
            yPos += 5;

            doc.setFont("helvetica", "normal");
            doc.setTextColor(isCorrect ? 0 : 200, isCorrect ? 100 : 0, 0);
            doc.text(`Réponse: ${q.options[userAnswer]} ${isCorrect ? '(Correct)' : '(Incorrect)'}`, 25, yPos, { maxWidth: 165 });

            if (!isCorrect) {
                yPos += 5;
                doc.setTextColor(0, 100, 0);
                doc.text(`Correction: ${q.options[q.correctAnswer]}`, 25, yPos, { maxWidth: 165 });
            }

            yPos += 10;
        });

        doc.save(`Rapport_${result.student.name}.pdf`);
    };

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

    // Chart Data
    const performanceData = [
        { name: 'Vous', score: result.scoreOn20, fill: '#4F46E5' },
        { name: 'Moyenne', score: classStats.average, fill: '#10B981' },
        { name: 'Max', score: classStats.max, fill: '#F59E0B' },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
            style={{ backgroundImage: "url('/academy-bg.png')", backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(255,255,255,0.9)' }}>

            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden transform transition-all hover:scale-[1.01]">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Score & Time */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
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

                            {/* Student Info */}
                            <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                    <span className="text-gray-600">Nom</span>
                                    <span className="font-semibold">{result.student.grade} {result.student.name}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                    <span className="text-gray-600">Classe</span>
                                    <span className="font-semibold">{result.student.className}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Matricule</span>
                                    <span className="font-semibold">{result.student.matricule}</span>
                                </div>
                            </div>
                        </div>

                        {/* Comparative Chart */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                                <BarChartIcon className="w-4 h-4 mr-2 text-blue-600" />
                                Analyse Comparative
                            </h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={performanceData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" domain={[0, 20]} />
                                        <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="score" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                            {performanceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Encouraging message for students who failed (< 10/20) */}
                    {!isPass && (
                        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-6 shadow-md">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <TrendingUp className="h-8 w-8 text-blue-500" />
                                </div>
                                <div className="ml-4 flex-1">
                                    <h3 className="text-lg font-bold text-blue-900 mb-3">
                                        Message d'Encouragement
                                    </h3>
                                    <div className="text-blue-800 space-y-3">
                                        <p className="leading-relaxed">
                                            <strong>Ne vous découragez pas !</strong> L'apprentissage est un processus continu.
                                        </p>
                                        <p className="leading-relaxed">
                                            Votre score de <strong>{result.scoreOn20.toFixed(1)}/20</strong> montre qu'il faut approfondir vos connaissances.
                                        </p>
                                        <div className="bg-white bg-opacity-60 rounded-lg p-4 mt-4">
                                            <p className="font-semibold text-blue-900 mb-2 flex items-center">
                                                <BookOpen className="w-4 h-4 mr-2" />
                                                Recommandations :
                                            </p>
                                            <ul className="list-disc list-inside space-y-2 text-sm">
                                                <li>Revoyez attentivement le cours et vos notes</li>
                                                <li>Consultez <strong>Lt Col Oussama Atoui</strong></li>
                                                <li>Demandez des explications sur vos erreurs</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Visual Certificate for scores <= 15 */}
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

                        <button
                            onClick={generateReport}
                            className="px-6 py-3 rounded-lg bg-gray-800 text-white font-bold hover:bg-gray-900 flex items-center justify-center shadow-md transition-colors"
                        >
                            <FileText className="w-5 h-5 mr-2" />
                            Télécharger Rapport PDF
                        </button>

                        {/* Download Certificate button only for scores > 15 */}
                        {isPass && canDownloadCertificate && (
                            <button
                                onClick={async () => {
                                    try {
                                        await generateCertificate(result);
                                    } catch (error) {
                                        console.error("Certificate generation failed:", error);
                                        alert("Erreur lors de la génération du certificat. Veuillez réessayer.");
                                    }
                                }}
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
