import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, CheckCircle, XCircle, FileText, TrendingUp, AlertTriangle, Award, BookOpen } from 'lucide-react';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
    timeElapsed: number;
    discipline: string;
    timestamp: number;
    answers: number[];
}

const StudentDetail: React.FC = () => {
    const navigate = useNavigate();
    const { timestamp } = useParams<{ timestamp: string }>();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
    const [classStats, setClassStats] = useState({ average: 0, max: 0, min: 0 });

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('adminAuthenticated');
        if (!isAuthenticated) {
            navigate('/admin/login');
            return;
        }

        // Fetch session data from server to get all results
        fetch('/api/admin/session')
            .then(res => res.json())
            .then(data => {
                const allResults = data.results || [];
                const foundResult = allResults.find((r: QuizResult) => r.timestamp.toString() === timestamp);

                if (foundResult) {
                    setResult(foundResult);

                    // Calculate class stats for this discipline
                    const disciplineResults = allResults.filter((r: QuizResult) => r.discipline === foundResult.discipline);
                    const scores = disciplineResults.map((r: QuizResult) => r.scoreOn20);
                    const average = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
                    const max = Math.max(...scores);
                    const min = Math.min(...scores);
                    setClassStats({ average, max, min });

                    // Fetch questions
                    fetch(`/quiz_data_${foundResult.discipline}.json`)
                        .then(res => res.json())
                        .then(data => setQuizQuestions(data.questions))
                        .catch(err => console.error("Failed to load questions", err));
                } else {
                    console.error("Student result not found for timestamp:", timestamp);
                    navigate('/admin/dashboard');
                }
            })
            .catch(err => {
                console.error("Failed to fetch session data:", err);
                navigate('/admin/dashboard');
            });
    }, [navigate, timestamp]);

    if (!result) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

    const generateReport = async () => {
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
            stampDataUrl = await loadImage('/golden_stamp.png');
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

        // Add signature on the left
        if (signatureDataUrl) {
            doc.addImage(signatureDataUrl, 'PNG', 20, 25, 50, 25); // Larger and adjusted
        }

        // Add Golden Stamp
        if (stampDataUrl) {
            doc.addImage(stampDataUrl, 'PNG', 60, 25, 30, 30);
        }

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("Lt Col Oussama Atoui", 40, 53, { align: "center" });
        doc.text("Instructeur Armes et Munitions", 40, 57, { align: "center" });

        // Student information
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

    // Chart Data
    const performanceData = [
        { name: 'Étudiant', score: result.scoreOn20, fill: '#4F46E5' },
        { name: 'Moyenne Classe', score: classStats.average, fill: '#10B981' },
        { name: 'Max Classe', score: classStats.max, fill: '#F59E0B' },
    ];

    const correctCount = result.answers.filter((a, i) => a === quizQuestions[i]?.correctAnswer).length;
    const incorrectCount = result.answers.length - correctCount;

    const accuracyData = [
        { name: 'Correct', value: correctCount },
        { name: 'Incorrect', value: incorrectCount },
    ];
    const COLORS = ['#10B981', '#EF4444'];

    // Recommendations
    const getRecommendations = () => {
        if (result.scoreOn20 < 10) {
            return {
                level: 'critical',
                title: 'Attention Requise',
                color: 'text-red-700',
                bg: 'bg-red-50',
                border: 'border-red-200',
                icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
                items: [
                    "Revoir les fondamentaux du cours immédiatement.",
                    "Prendre rendez-vous avec l'instructeur pour une session de rattrapage.",
                    "Refaire les exercices pratiques du chapitre.",
                    "Analyser chaque erreur commise dans ce quiz."
                ]
            };
        } else if (result.scoreOn20 < 15) {
            return {
                level: 'warning',
                title: 'Peut Mieux Faire',
                color: 'text-yellow-700',
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                icon: <TrendingUp className="w-6 h-6 text-yellow-600" />,
                items: [
                    "Identifier les sujets spécifiques qui posent problème.",
                    "Approfondir les notes de cours sur les questions manquées.",
                    "Participer plus activement aux sessions de révision.",
                    "Viser la mention 'Très Bien' au prochain test."
                ]
            };
        } else {
            return {
                level: 'success',
                title: 'Excellent Travail',
                color: 'text-green-700',
                bg: 'bg-green-50',
                border: 'border-green-200',
                icon: <Award className="w-6 h-6 text-green-600" />,
                items: [
                    "Continuer sur cette lancée.",
                    "Aider les camarades qui ont des difficultés.",
                    "Se préparer pour les modules avancés.",
                    "Maintenir cette rigueur dans les prochains examens."
                ]
            };
        }
    };

    const recommendation = getRecommendations();

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Retour au tableau de bord
                </button>

                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
                    <div className="bg-military-green p-6 text-white flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">{result.student.grade} {result.student.name}</h1>
                            <p className="opacity-90 text-lg">{result.student.className} - {result.student.matricule}</p>
                            <p className="text-sm mt-1 opacity-75">{result.discipline}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-5xl font-bold">{result.scoreOn20.toFixed(1)}<span className="text-2xl">/20</span></div>
                            <p className="text-lg opacity-90">{Math.round(result.score)}% de réussite</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Left Column: Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Performance Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                <BarChart className="w-5 h-5 mr-2 text-blue-600" />
                                Analyse Comparative
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={performanceData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" domain={[0, 20]} />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="score" fill="#8884d8" name="Score (/20)" radius={[0, 4, 4, 0]}>
                                            {performanceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Accuracy Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col md:flex-row items-center justify-between">
                            <div className="w-full md:w-1/2 h-64">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Précision</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={accuracyData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {accuracyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full md:w-1/2 p-4">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                        <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                                        <p className="text-sm text-green-800">Réponses Correctes</p>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                                        <p className="text-2xl font-bold text-red-600">{incorrectCount}</p>
                                        <p className="text-sm text-red-800">Réponses Incorrectes</p>
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 col-span-2">
                                        <p className="text-2xl font-bold text-blue-600">{Math.floor(result.timeElapsed / 60)}m {result.timeElapsed % 60}s</p>
                                        <p className="text-sm text-blue-800">Temps Total</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Recommendations & Actions */}
                    <div className="space-y-6">
                        {/* Recommendations Card */}
                        <div className={`bg-white rounded-xl shadow-md overflow-hidden border-t-4 ${recommendation.level === 'critical' ? 'border-red-500' : recommendation.level === 'warning' ? 'border-yellow-500' : 'border-green-500'}`}>
                            <div className="p-6">
                                <div className="flex items-center mb-4">
                                    {recommendation.icon}
                                    <h3 className={`text-xl font-bold ml-2 ${recommendation.color}`}>{recommendation.title}</h3>
                                </div>
                                <div className={`p-4 rounded-lg ${recommendation.bg} ${recommendation.border} border mb-4`}>
                                    <h4 className={`font-semibold mb-2 flex items-center ${recommendation.color}`}>
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Recommandations
                                    </h4>
                                    <ul className={`list-disc list-inside space-y-2 text-sm ${recommendation.color}`}>
                                        {recommendation.items.map((item, idx) => (
                                            <li key={idx}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    onClick={generateReport}
                                    className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center font-bold"
                                >
                                    <FileText className="w-5 h-5 mr-2" />
                                    Télécharger Rapport PDF
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="font-bold text-gray-800 mb-4">Statistiques Rapides</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-600">Rang dans la classe</span>
                                    <span className="font-bold text-gray-900">Calcul en cours...</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-600">Écart à la moyenne</span>
                                    <span className={`font-bold ${result.scoreOn20 >= classStats.average ? 'text-green-600' : 'text-red-600'}`}>
                                        {result.scoreOn20 >= classStats.average ? '+' : ''}{(result.scoreOn20 - classStats.average).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Answers Section */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-800">Détail des Réponses ({quizQuestions.length} Questions)</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {quizQuestions.map((q, index) => {
                                const userAnswer = result.answers[index];
                                const isCorrect = userAnswer === q.correctAnswer;

                                return (
                                    <div key={index} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`font-bold text-sm px-2 py-1 rounded ${isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                Q{index + 1}
                                            </span>
                                            {isCorrect ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                                        </div>
                                        <p className="text-sm text-gray-800 font-medium mb-2 line-clamp-2" title={q.question}>{q.question}</p>
                                        <div className="text-xs space-y-1">
                                            <p className={`${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                <span className="font-semibold">Réponse:</span> {q.options[userAnswer] || "Non répondu"}
                                            </p>
                                            {!isCorrect && (
                                                <p className="text-green-700">
                                                    <span className="font-semibold">Correct:</span> {q.options[q.correctAnswer]}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDetail;
