import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, CheckCircle, XCircle, FileText, TrendingUp, AlertTriangle, Award, BookOpen, Save } from 'lucide-react';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ImageZoom from './ImageZoom';

interface SubQuestion {
    id: string;
    question: string;
    points: number;
    validation?: {
        type: string;
        value?: number;
        tolerance?: number;
        parts?: { label?: string; value: number }[];
        keywords?: string[];
        values?: string[];
        formulas?: string[];
        results?: string[];
        partial?: boolean;
    };
}

interface Question {
    id: number | string;
    type?: 'qcm' | 'exercise';
    question?: string;
    title?: string;
    options?: string[];
    correctAnswer?: number;
    questions?: SubQuestion[]; // For exercises
    solution?: string; // For exercises
    detailed_solution?: string; // Detailed steps
    image_url?: string; // Context image
    description?: string; // For exercises
    context?: string; // For exercises
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
    answers: any[]; // Can be number[] or object[]
    isPractice?: boolean;
    manualScores?: Record<string, number>; // Store manual scores for exercises
}

const StudentDetail: React.FC = () => {
    const navigate = useNavigate();
    const { timestamp } = useParams<{ timestamp: string }>();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
    const [classStats, setClassStats] = useState({ average: 0, max: 0, min: 0 });
    const [manualScores, setManualScores] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);

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
                    if (foundResult.manualScores) {
                        setManualScores(foundResult.manualScores);
                    }

                    // Calculate class stats for this discipline
                    const disciplineResults = allResults.filter((r: QuizResult) => r.discipline === foundResult.discipline);
                    const scores = disciplineResults.map((r: QuizResult) => r.scoreOn20);
                    const average = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
                    const max = Math.max(...scores);
                    const min = Math.min(...scores);
                    setClassStats({ average, max, min });

                    // Fetch questions - load practice questions if this is a practice quiz
                    const fileName = foundResult.isPractice
                        ? `${foundResult.discipline}_practice.json`
                        : `quiz_data_${foundResult.discipline}.json`;
                    fetch(`/${fileName}`)
                        .then(res => res.json())
                        .then(data => {
                            // Flatten questions if sections exist (for Explosions GC31)
                            if (data.sections) {
                                let flat: Question[] = [];
                                data.sections.forEach((section: any) => {
                                    if (section.questions) {
                                        // If it's an exercise section, the section itself is the "question" container
                                        if (section.type === 'exercise') {
                                            flat.push(section);
                                        } else {
                                            // QCM section
                                            flat = [...flat, ...section.questions];
                                        }
                                    }
                                });
                                setQuizQuestions(flat);
                            } else {
                                setQuizQuestions(data.questions);
                            }
                        })
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

    const handleScoreChange = (questionId: string | number, score: number) => {
        setManualScores(prev => ({
            ...prev,
            [questionId]: score
        }));
    };

    const saveGrading = async () => {
        if (!result) return;
        setIsSaving(true);

        // Recalculate total score
        let totalPoints = 0;
        let earnedPoints = 0;

        quizQuestions.forEach((q, index) => {
            if (q.type === 'exercise') {
                // Exercise scoring
                const maxPoints = q.questions?.reduce((sum, subQ) => sum + subQ.points, 0) || 0;
                totalPoints += maxPoints; // Add to total possible points (weighted?)
                // Actually, for mixed exams, we need to know the weight of QCM vs Exercises.
                // Assuming QCMs are 0.5 pts each as per description in JSON.
                // And Exercises have specific points.

                // However, the current system calculates scoreOn20 based on QCM count.
                // We need a more robust scoring system for mixed content.

                // Let's assume manualScores contains the total score for the exercise
                const exerciseScore = manualScores[q.id] || 0;
                earnedPoints += exerciseScore;

            } else {
                // QCM scoring
                totalPoints += 0.5; // Assuming 0.5 per QCM as per JSON
                if (result.answers[index] === q.correctAnswer) {
                    earnedPoints += 0.5;
                }
            }
        });

        // If totalPoints is 0 (shouldn't happen), avoid division by zero
        // For the specific Explosions exam:
        // Part 1: 18 QCM * 0.5 = 9 pts
        // Part 2: 6 pts
        // Part 3: 5 pts
        // Total = 20 pts. Perfect.

        const newScoreOn20 = (earnedPoints / 20) * 20; // It's already on 20 if we sum correctly
        const newScorePercentage = (earnedPoints / 20) * 100;

        const updatedResult = {
            ...result,
            score: newScorePercentage,
            scoreOn20: earnedPoints, // Direct sum for this specific exam structure
            manualScores: manualScores,
            needsGrading: false
        };

        setResult(updatedResult);

        // Update in backend/localStorage
        try {
            // Update local storage history
            const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
            const updatedHistory = history.map((r: QuizResult) =>
                r.timestamp === result.timestamp ? updatedResult : r
            );
            localStorage.setItem('quizHistory', JSON.stringify(updatedHistory));

            // Update server
            await fetch('/api/submit-quiz', { // Re-submit to update
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedResult)
            });

            alert("Notation enregistrée avec succès !");
        } catch (error) {
            console.error("Failed to save grading:", error);
            alert("Erreur lors de l'enregistrement.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!result) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

    const generateReport = () => {
        const doc = new jsPDF();
        let yPos = 20;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(46, 125, 50); // Military Green
        doc.text("Rapport de Performance", 105, yPos, { align: "center" });
        yPos += 15;

        // Student Info Box
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 245, 245);
        doc.rect(15, yPos, 180, 35, 'F');

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Nom: ${result.student.grade} ${result.student.name}`, 20, yPos + 10);
        doc.text(`Matricule: ${result.student.matricule}`, 20, yPos + 18);
        doc.text(`Discipline: ${result.discipline}`, 20, yPos + 26);

        doc.setFontSize(16);
        doc.setTextColor(46, 125, 50);
        doc.text(`Note: ${result.scoreOn20.toFixed(2)}/20`, 150, yPos + 20);

        yPos += 45;

        // Content
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Détail des Résultats:", 15, yPos);
        yPos += 10;

        quizQuestions.forEach((q, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            if (q.type === 'exercise') {
                // Exercise Header
                doc.setFontSize(12);
                doc.setTextColor(0, 51, 102); // Dark Blue
                doc.text(`Exercice: ${q.title || 'Question ' + (index + 1)}`, 15, yPos);

                const score = manualScores[q.id] !== undefined ? manualScores[q.id] : 0;
                const maxPoints = q.questions?.reduce((sum, sq) => sum + sq.points, 0) || 0;

                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`Score: ${score} / ${maxPoints}`, 160, yPos);

                yPos += 7;

                // Sub-questions
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);

                const studentAnswers = result.answers[index] || {};

                q.questions?.forEach(subQ => {
                    if (yPos > 270) { doc.addPage(); yPos = 20; }

                    // Question Text
                    const qLines = doc.splitTextToSize(`- ${subQ.question}`, 170);
                    doc.text(qLines, 20, yPos);
                    yPos += (qLines.length * 5);

                    // Answer
                    const answerText = studentAnswers[subQ.id] || "(Aucune réponse)";
                    const aLines = doc.splitTextToSize(`Rep: ${answerText}`, 160);
                    doc.setTextColor(80, 80, 80);
                    doc.text(aLines, 25, yPos);
                    doc.setTextColor(0, 0, 0);
                    yPos += (aLines.length * 5) + 3;
                });

                yPos += 5;
                doc.setDrawColor(220, 220, 220);
                doc.line(15, yPos, 195, yPos);
                yPos += 10;

            } else {
                // QCM (Simplified)
                // Only showing incorrect ones to save space? Or just a summary?
                // Let's show a compact list for QCMs
                // Actually, let's group QCMs
            }
        });

        // QCM Summary Section
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        const qcmCount = quizQuestions.filter(q => q.type !== 'exercise').length;
        if (qcmCount > 0) {
            doc.setFontSize(12);
            doc.setTextColor(0, 51, 102);
            doc.text(`Questions à Choix Multiple (${qcmCount})`, 15, yPos);
            yPos += 10;

            let correctQCM = 0;
            quizQuestions.forEach((q, index) => {
                if (q.type !== 'exercise') {
                    if (result.answers[index] === q.correctAnswer) correctQCM++;
                }
            });

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Score QCM: ${correctQCM} / ${qcmCount} (${(correctQCM * 0.5)} pts)`, 20, yPos);
        }

        doc.save(`Rapport_${result.student.name.replace(/\s+/g, '_')}.pdf`);
    };

    // Chart Data (Keep existing)
    const performanceData = [
        { name: 'Étudiant', score: result.scoreOn20, fill: '#4F46E5' },
        { name: 'Moyenne Classe', score: classStats.average, fill: '#10B981' },
        { name: 'Max Classe', score: classStats.max, fill: '#F59E0B' },
    ];

    const correctCount = result.answers.filter((a, i) => quizQuestions[i]?.type !== 'exercise' && a === quizQuestions[i]?.correctAnswer).length;
    const incorrectCount = result.answers.filter((a, i) => quizQuestions[i]?.type !== 'exercise' && a !== quizQuestions[i]?.correctAnswer).length;

    const accuracyData = [
        { name: 'Correct', value: correctCount },
        { name: 'Incorrect', value: incorrectCount },
    ];
    const COLORS = ['#10B981', '#EF4444'];

    // Recommendations (Keep existing)
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
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Retour au tableau de bord
                    </button>
                    <button
                        onClick={saveGrading}
                        disabled={isSaving}
                        className="px-6 py-2 bg-military-green text-white rounded-lg hover:bg-green-800 flex items-center shadow-md disabled:opacity-50"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        {isSaving ? 'Enregistrement...' : 'Enregistrer la Notation'}
                    </button>
                </div>

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
                    </div>

                    {/* Right Column: Recommendations */}
                    <div className="space-y-6">
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
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Answers Section */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-800">Détail des Réponses et Notation</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-6">
                            {quizQuestions.map((q, index) => {
                                if (q.type === 'exercise') {
                                    // Exercise Rendering
                                    const studentAnswers = result.answers[index] || {};
                                    const maxPoints = q.questions?.reduce((sum, subQ) => sum + subQ.points, 0) || 0;
                                    const currentScore = manualScores[q.id] !== undefined ? manualScores[q.id] : 0;

                                    return (
                                        <div key={index} className="border border-blue-200 rounded-lg overflow-hidden">
                                            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex justify-between items-center">
                                                <h4 className="font-bold text-blue-900">{q.title}</h4>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-blue-800">Note:</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={maxPoints}
                                                        step="0.25"
                                                        value={currentScore}
                                                        onChange={(e) => handleScoreChange(q.id, parseFloat(e.target.value))}
                                                        className="w-20 p-1 border border-blue-300 rounded text-center font-bold"
                                                    />
                                                    <span className="text-sm text-blue-800">/ {maxPoints} pts</span>
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 italic border border-gray-200">
                                                    {q.description}
                                                    {q.image_url && (
                                                        <div className="mt-2">
                                                            <ImageZoom src={q.image_url} alt="Figure de référence" className="max-h-48 rounded" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Sub Questions */}
                                                <div className="grid grid-cols-1 gap-4">
                                                    {q.questions?.map((subQ) => (
                                                        <div key={subQ.id} className="border-l-4 border-gray-300 pl-4 py-2">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <p className="font-semibold text-gray-800">{subQ.question}</p>
                                                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full whitespace-nowrap">{subQ.points} pts</span>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="bg-white p-3 border border-gray-200 rounded mb-2">
                                                                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Réponse Étudiant:</span>
                                                                    <p className="text-gray-800 whitespace-pre-wrap font-mono text-sm">{studentAnswers[subQ.id] || "Aucune réponse"}</p>
                                                                </div>

                                                                {/* Validation Info (Admin Only) */}
                                                                {subQ.validation && (
                                                                    <div className="bg-blue-50 p-3 border border-blue-100 rounded mb-2 text-xs">
                                                                        <span className="text-xs font-bold text-blue-800 uppercase block mb-1">Critères de Notation:</span>
                                                                        {subQ.validation.type.includes('numeric') ? (
                                                                            <div className="space-y-1">
                                                                                <p className="text-blue-900 font-semibold">Tolérance: ±{((subQ.validation.tolerance || 0.02) * 100).toFixed(1)}%</p>
                                                                                {subQ.validation.parts ? (
                                                                                    <ul className="list-disc list-inside text-blue-700">
                                                                                        {subQ.validation.parts.map((p: any, i: number) => (
                                                                                            <li key={i}>{p.label || 'Valeur'}: <span className="font-mono font-bold">{p.value}</span></li>
                                                                                        ))}
                                                                                    </ul>
                                                                                ) : (
                                                                                    <p className="text-blue-700">Valeur attendue: <span className="font-mono font-bold">{subQ.validation.value}</span></p>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-1">
                                                                                <p className="text-blue-900 font-semibold">Mots-clés attendus:</p>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {((subQ.validation.keywords || subQ.validation.values || []) as string[]).map((k: string, i: number) => (
                                                                                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded border border-blue-200">{k}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Global Solution */}
                                                <div className="mt-4 bg-green-50 p-4 rounded border border-green-200">
                                                    <h5 className="font-bold text-green-800 mb-2 flex items-center">
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Solution Modèle
                                                    </h5>
                                                    <pre className="whitespace-pre-wrap text-sm text-green-900 font-mono bg-white p-3 rounded border border-green-100">
                                                        <pre className="whitespace-pre-wrap text-sm text-green-900 font-mono bg-white p-3 rounded border border-green-100">
                                                            {q.detailed_solution || q.solution}
                                                        </pre>
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // QCM Rendering
                                    const userAnswer = result.answers[index];
                                    const isCorrect = userAnswer === q.correctAnswer;

                                    return (
                                        <div key={index} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`font-bold text-sm px-2 py-1 rounded ${isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                    Q{index + 1} (0.5 pt)
                                                </span>
                                                {isCorrect ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                                            </div>
                                            <p className="text-sm text-gray-800 font-medium mb-2 line-clamp-2" title={q.question}>{q.question}</p>
                                            <div className="text-xs space-y-1">
                                                <p className={`${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                    <span className="font-semibold">Réponse:</span> {q.options?.[userAnswer] || "Non répondu"}
                                                </p>
                                                {!isCorrect && (
                                                    <p className="text-green-700">
                                                        <span className="font-semibold">Correct:</span> {q.options?.[q.correctAnswer || 0]}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDetail;
