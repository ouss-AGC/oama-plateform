import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, CheckCircle, Clock } from 'lucide-react';

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
    timestamp: number;
    discipline: string;
    isPractice?: boolean;
    answers?: (number | null)[];
}

interface AdvancedAnalyticsProps {
    results: QuizResult[];
    discipline: string;
    quizType: string;
    onBack: () => void;
}

interface Question {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
}

interface QuizData {
    title: string;
    questions: Question[];
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ results, discipline, quizType, onBack }) => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    useEffect(() => {
        const fetchQuestions = async () => {
            if (discipline === 'all' || quizType === 'all') {
                setQuestions([]);
                return;
            }

            setLoadingQuestions(true);
            try {
                // Determine filename based on discipline and quiz type
                // If quizType is 'official', use quiz_data_{discipline}.json
                // If quizType is 'practice', use {discipline}_practice.json
                // Note: This logic assumes these file naming conventions exist
                const fileName = quizType === 'practice'
                    ? `${discipline}_practice.json`
                    : `quiz_data_${discipline}.json`;

                const response = await fetch(`/${fileName}`);
                if (response.ok) {
                    const data: QuizData = await response.json();
                    setQuestions(data.questions);
                } else {
                    console.error("Failed to load quiz questions");
                    setQuestions([]);
                }
            } catch (error) {
                console.error("Error fetching questions:", error);
                setQuestions([]);
            } finally {
                setLoadingQuestions(false);
            }
        };

        fetchQuestions();
    }, [discipline, quizType]);

    // Calculate statistics
    const totalParticipants = results.length;
    const averageScore = results.length > 0
        ? (results.reduce((acc, r) => acc + r.scoreOn20, 0) / results.length).toFixed(1)
        : 0;
    const passRate = results.length > 0
        ? Math.round((results.filter(r => r.scoreOn20 >= 10).length / results.length) * 100)
        : 0;

    // Calculate average completion time from real data
    const avgTime = results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + r.timeElapsed, 0) / results.length / 60) // Convert seconds to minutes
        : 0;

    // Calculate question difficulty
    const questionStats = (results.length > 0 && questions.length > 0)
        ? calculateQuestionDifficulty(results, questions)
        : [];

    // Calculate time distribution
    const timeDistribution = calculateTimeDistribution(results);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center text-yellow-500 hover:text-yellow-400 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 mr-2" />
                        Retour
                    </button>
                    <div className="flex items-center gap-3">
                        <img src="/academy-logo.png" alt="OAMA Logo" className="w-14 h-14" />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-white bg-clip-text text-transparent">
                            Dashboard Administrateur - Statistiques Avancées
                        </h1>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/admin/login')}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-lg font-bold hover:from-red-700 hover:to-red-800 transition-all"
                >
                    Déconnexion
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatsCard
                    icon={<Users className="w-8 h-8" />}
                    value={totalParticipants}
                    label="Total Participants"
                    gradient="from-purple-600 to-purple-800"
                />
                <StatsCard
                    icon={<TrendingUp className="w-8 h-8" />}
                    value={`${averageScore}/20`}
                    label="Score Moyen"
                    gradient="from-blue-600 to-blue-800"
                />
                <StatsCard
                    icon={<CheckCircle className="w-8 h-8" />}
                    value={`${passRate}%`}
                    label="Taux de Réussite"
                    gradient="from-green-600 to-green-800"
                />
                <StatsCard
                    icon={<Clock className="w-8 h-8" />}
                    value={`${avgTime} min`}
                    label="Temps Moyen"
                    gradient="from-orange-600 to-orange-800"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <ChartCard title="📉 Questions les Plus Difficiles">
                    {(discipline === 'all' || quizType === 'all') ? (
                        <div className="h-64 flex items-center justify-center text-center p-4 text-gray-400">
                            <p>Veuillez sélectionner une discipline spécifique et un type de quiz (Officiel/Pratique) pour voir l'analyse détaillée par question.</p>
                        </div>
                    ) : loadingQuestions ? (
                        <div className="h-64 flex items-center justify-center text-gray-400">Chargement des questions...</div>
                    ) : questionStats.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-400">Aucune donnée disponible</div>
                    ) : (
                        <DifficultQuestionsChart questions={questionStats.slice(0, 5)} />
                    )}
                </ChartCard>
                <ChartCard title="⏰ Analyse du Temps de Complétion">
                    <TimeAnalysisChart timeData={timeDistribution} />
                </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <ChartCard title="🎯 Lacunes Communes par Thème">
                    <ThemesDonutChart />
                </ChartCard>
                <ChartCard title="🎯 Performance Multi-dimensionnelle">
                    <RadarChartComponent />
                </ChartCard>
            </div>

            {/* Confusion Matrix */}
            <ChartCard title="🔍 Matrice de Confusion - Question 14" fullWidth>
                <p className="text-gray-400 text-sm mb-4">
                    "Dans la méthode d'intégration temporelle directe, quelle est la différence clé..."
                </p>
                <ConfusionMatrix />
                <p className="mt-4 text-gray-300">
                    💡 <strong>Insight:</strong> 35% des participants ont choisi A au lieu de B - Confusion sur les procédures implicites vs explicites
                </p>
            </ChartCard>

            {/* Treemap */}
            <ChartCard title="🌳 Visualisation Hiérarchique des Thèmes Problématiques" fullWidth>
                <Treemap />
            </ChartCard>
        </div>
    );
};

// Helper Components
const StatsCard: React.FC<{ icon: React.ReactNode; value: string | number; label: string; gradient: string }> =
    ({ icon, value, label, gradient }) => (
        <div className={`bg-gradient-to-br ${gradient} rounded-xl p-6 shadow-xl relative overflow-hidden`}>
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-white opacity-10"></div>
            <div className="relative z-10">
                <div className="text-white mb-3">{icon}</div>
                <div className="text-4xl font-bold text-white mb-2">{value}</div>
                <div className="text-white text-sm opacity-90">{label}</div>
            </div>
        </div>
    );

const ChartCard: React.FC<{ title: string; children: React.ReactNode; fullWidth?: boolean }> =
    ({ title, children, fullWidth }) => (
        <div className={`bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-xl p-6 border border-gray-700 ${fullWidth ? 'col-span-full' : ''}`}>
            <h2 className="text-xl font-bold text-yellow-500 mb-6">{title}</h2>
            {children}
        </div>
    );

const DifficultQuestionsChart: React.FC<{ questions: any[] }> = ({ questions }) => {
    return (
        <div className="space-y-4">
            {questions.map((q) => (
                <div key={q.id} className="flex items-center gap-4">
                    <span className="text-white font-bold w-8 flex-shrink-0">Q{q.id}</span>
                    <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1 truncate" title={q.text}>{q.text}</div>
                        <div className="bg-gray-700 rounded-full h-6 overflow-hidden">
                            <div
                                className={`${q.color} h-full flex items-center justify-end pr-3 text-white font-bold text-xs transition-all duration-500`}
                                style={{ width: `${q.rate}%` }}
                            >
                                {q.rate}%
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const TimeAnalysisChart: React.FC<{ timeData: any[] }> = ({ timeData }) => {
    // Use real data if available, otherwise show empty state
    if (timeData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400">
                <p>Aucune donnée disponible. Les participants doivent d'abord passer le quiz.</p>
            </div>
        );
    }

    const maxCount = Math.max(...timeData.map(d => d.count));

    return (
        <div className="h-64 flex items-end justify-around gap-2">
            {timeData.map((item, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                    <div
                        className={`${item.color} w-full rounded-t-lg transition-all duration-500 flex items-end justify-center pb-1`}
                        style={{ height: `${(item.count / maxCount) * 200}px`, minHeight: '30px' }}
                    >
                        <span className="text-white font-bold text-xs">{item.count}</span>
                    </div>
                    <span className="text-xs text-gray-400 mt-2">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

const ThemesDonutChart: React.FC = () => {
    const themes = [
        { name: 'Chaîne Pyrotechnique', percent: 35, color: 'from-red-600 to-red-700' },
        { name: 'Classification', percent: 28, color: 'from-orange-600 to-orange-700' },
        { name: 'Sécurité', percent: 22, color: 'from-blue-600 to-blue-700' },
        { name: 'Nomenclature', percent: 15, color: 'from-purple-600 to-purple-700' }
    ];

    return (
        <div className="space-y-4">
            {themes.map((theme, i) => (
                <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{theme.name}</span>
                        <span className="text-white font-bold">{theme.percent}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className={`bg-gradient-to-r ${theme.color} h-full transition-all duration-500`}
                            style={{ width: `${theme.percent}%` }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const RadarChartComponent: React.FC = () => {
    const dimensions = ['Vitesse', 'Précision', 'Chaîne Pyro', 'Classification', 'Sécurité'];
    const values = [75, 68, 55, 72, 78];

    return (
        <div className="flex flex-col items-center justify-center h-64">
            <svg viewBox="0 0 200 200" className="w-full h-full max-w-xs">
                {/* Pentagon background */}
                <polygon
                    points="100,20 180,70 150,160 50,160 20,70"
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="rgba(59, 130, 246, 0.3)"
                    strokeWidth="1"
                />
                {/* Data pentagon */}
                <polygon
                    points="100,35 155,65 130,140 70,140 45,65"
                    fill="rgba(59, 130, 246, 0.3)"
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="2"
                />
                {/* Labels */}
                <text x="100" y="15" textAnchor="middle" fill="white" fontSize="10">Vitesse</text>
                <text x="185" y="75" textAnchor="start" fill="white" fontSize="10">Précision</text>
                <text x="155" y="175" textAnchor="middle" fill="white" fontSize="10">Chaîne Pyro</text>
                <text x="45" y="175" textAnchor="middle" fill="white" fontSize="10">Classif.</text>
                <text x="15" y="75" textAnchor="end" fill="white" fontSize="10">Sécurité</text>
            </svg>
        </div>
    );
};

const ConfusionMatrix: React.FC = () => {
    const matrix = [
        ['', 'A', 'B', 'C', 'D'],
        ['A', '2', '1', '0', '1'],
        ['B ✓', '9', '9', '2', '1'],
        ['C', '1', '0', '4', '2'],
        ['D', '0', '1', '1', '0']
    ];

    const getCellColor = (row: number, col: number, value: string) => {
        if (row === 0 || col === 0) return 'bg-yellow-900 bg-opacity-30 text-yellow-500';
        if (row === 2 && col === 2) return 'bg-gradient-to-br from-green-600 to-green-700';
        if (row === 2 && col === 1 && value === '9') return 'bg-gradient-to-br from-red-600 to-red-700';
        if (parseInt(value) >= 2) return 'bg-gradient-to-br from-orange-600 to-orange-700';
        return 'bg-gray-700 bg-opacity-50';
    };

    return (
        <div className="grid grid-cols-5 gap-2 max-w-2xl mx-auto">
            {matrix.map((row, i) =>
                row.map((cell, j) => (
                    <div
                        key={`${i}-${j}`}
                        className={`aspect-square flex items-center justify-center font-bold text-lg rounded-lg ${getCellColor(i, j, cell)}`}
                    >
                        {cell}
                    </div>
                ))
            )}
        </div>
    );
};

const Treemap: React.FC = () => {
    return (
        <div className="grid grid-cols-2 grid-rows-2 gap-4 h-96">
            <div className="row-span-2 bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-xl">
                <div className="text-sm opacity-90">Chaîne Pyrotechnique</div>
                <div className="text-5xl font-bold my-3">35%</div>
                <div className="text-xs opacity-80">Amorçage • Détonateurs • Transmission</div>
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-xl">
                <div className="text-sm opacity-90">Classification</div>
                <div className="text-3xl font-bold my-2">28%</div>
                <div className="text-xs opacity-80">Types • Marquage OTAN</div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-xl">
                <div className="text-sm opacity-90">Sécurité</div>
                <div className="text-3xl font-bold my-2">22%</div>
                <div className="text-xs opacity-80">Stockage • Transport</div>
            </div>
            <div className="col-span-2 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-xl">
                <div className="text-sm opacity-90">Nomenclature</div>
                <div className="text-3xl font-bold my-2">15%</div>
                <div className="text-xs opacity-80">Codes • Désignations</div>
            </div>
        </div>
    );
};

// Helper function to calculate question difficulty from real results
// Helper function to calculate question difficulty from real results
function calculateQuestionDifficulty(results: QuizResult[], questions: Question[]) {
    if (results.length === 0 || questions.length === 0) return [];

    // Initialize stats for each question
    const stats = questions.map(q => ({
        id: q.id,
        text: q.question,
        correctCount: 0,
        totalAttempts: 0,
        rate: 0,
        color: ''
    }));

    // Iterate through all results
    results.forEach(result => {
        if (!result.answers) return;

        result.answers.forEach((answerIndex, qIndex) => {
            // Ensure we don't go out of bounds if questions changed
            if (qIndex < stats.length) {
                stats[qIndex].totalAttempts++;
                // Check if answer is correct
                // Note: questions[qIndex] corresponds to the question at that index
                // We assume the order is preserved. 
                // Ideally we should match by ID but results usually store answers in order.
                if (answerIndex === questions[qIndex].correctAnswer) {
                    stats[qIndex].correctCount++;
                }
            }
        });
    });

    // Calculate rates and sort by difficulty (lowest success rate first)
    const finalStats = stats
        .map(s => ({
            ...s,
            rate: s.totalAttempts > 0 ? Math.round((s.correctCount / s.totalAttempts) * 100) : 0
        }))
        .sort((a, b) => a.rate - b.rate) // Sort ascending (hardest first)
        .map(s => {
            // Assign color based on rate
            let color = 'bg-red-500';
            if (s.rate >= 80) color = 'bg-green-500';
            else if (s.rate >= 60) color = 'bg-lime-500';
            else if (s.rate >= 40) color = 'bg-yellow-500';
            else if (s.rate >= 20) color = 'bg-orange-500';
            return { ...s, color };
        });

    return finalStats;
}

// Helper function to calculate answer distribution for a specific question
function calculateAnswerDistribution(results: QuizResult[], questionId: number, questions: Question[]) {
    const question = questions.find(q => q.id === questionId);
    if (!question) return null;

    const counts: { [key: string]: number } = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
    let total = 0;

    // Map index to letter (0 -> A, 1 -> B, etc.)
    const indexToLetter = ['A', 'B', 'C', 'D'];
    const correctAnswerLetter = indexToLetter[question.correctAnswer];

    results.forEach(result => {
        if (!result.answers) return;

        // Find the index of this question in the quiz (assuming order is preserved)
        // This is tricky if we don't have the original index. 
        // We assume questions array matches the answers array order.
        const qIndex = questions.findIndex(q => q.id === questionId);

        if (qIndex !== -1 && qIndex < result.answers.length) {
            const answerIndex = result.answers[qIndex];
            if (answerIndex !== null && answerIndex >= 0 && answerIndex < 4) {
                const letter = indexToLetter[answerIndex];
                counts[letter]++;
                total++;
            }
        }
    });

    return {
        counts,
        total,
        correctAnswer: correctAnswerLetter
    };
}

// Helper function to calculate time distribution
function calculateTimeDistribution(results: QuizResult[]) {
    if (results.length === 0) return [];

    const timeRanges = [
        { label: '< 10min', min: 0, max: 600, count: 0, color: 'bg-red-500' },
        { label: '10-15min', min: 600, max: 900, count: 0, color: 'bg-red-400' },
        { label: '15-20min', min: 900, max: 1200, count: 0, color: 'bg-green-500' },
        { label: '20-25min', min: 1200, max: 1500, count: 0, color: 'bg-green-500' },
        { label: '25-30min', min: 1500, max: 1800, count: 0, color: 'bg-green-400' },
        { label: '30-40min', min: 1800, max: 2400, count: 0, color: 'bg-orange-500' },
        { label: '> 40min', min: 2400, max: Infinity, count: 0, color: 'bg-orange-400' }
    ];

    results.forEach(result => {
        const timeInSeconds = result.timeElapsed;
        const range = timeRanges.find(r => timeInSeconds >= r.min && timeInSeconds < r.max);
        if (range) range.count++;
    });

    return timeRanges.filter(r => r.count > 0);
}

export default AdvancedAnalytics;
