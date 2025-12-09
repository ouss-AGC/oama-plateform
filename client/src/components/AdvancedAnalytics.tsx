import React, { useEffect, useRef } from 'react';
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
    answers: number[];
    discipline: string;
    timestamp: number;
    isPractice?: boolean;
}

interface AdvancedAnalyticsProps {
    results: QuizResult[];
    discipline: string;
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ results, discipline }) => {
    const navigate = useNavigate();

    // Calculate statistics
    const totalParticipants = results.length;
    const averageScore = results.length > 0
        ? (results.reduce((acc, r) => acc + r.scoreOn20, 0) / results.length).toFixed(1)
        : 0;
    const passRate = results.length > 0
        ? Math.round((results.filter(r => r.scoreOn20 >= 10).length / results.length) * 100)
        : 0;

    // Calculate average completion time (mock for now - would need actual time data)
    const avgTime = 25;

    // Calculate question difficulty
    const questionStats = results.length > 0 ? calculateQuestionDifficulty(results) : [];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="flex items-center text-yellow-500 hover:text-yellow-400 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 mr-2" />
                        Retour
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-full flex items-center justify-center text-xs font-bold text-center shadow-lg">
                            OAMA<br />LOGO
                        </div>
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
                    <DifficultQuestionsChart questions={questionStats.slice(0, 5)} />
                </ChartCard>
                <ChartCard title="⏰ Analyse du Temps de Complétion">
                    <TimeAnalysisChart />
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
    const mockQuestions = [
        { id: 14, rate: 35, color: 'bg-red-500' },
        { id: 8, rate: 42, color: 'bg-orange-500' },
        { id: 23, rate: 48, color: 'bg-yellow-500' },
        { id: 5, rate: 55, color: 'bg-lime-500' },
        { id: 17, rate: 61, color: 'bg-green-500' }
    ];

    return (
        <div className="space-y-4">
            {mockQuestions.map((q) => (
                <div key={q.id} className="flex items-center gap-4">
                    <span className="text-white font-bold w-12">Q{q.id}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-8 overflow-hidden">
                        <div
                            className={`${q.color} h-full flex items-center justify-end pr-3 text-white font-bold text-sm transition-all duration-500`}
                            style={{ width: `${q.rate}%` }}
                        >
                            {q.rate}%
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const TimeAnalysisChart: React.FC = () => (
    <div className="h-64 flex items-end justify-around gap-2">
        {[
            { time: '10min', count: 2, color: 'bg-red-500', label: 'Trop Rapide' },
            { time: '15min', count: 3, color: 'bg-red-400', label: '' },
            { time: '20min', count: 5, color: 'bg-green-500', label: 'Normal' },
            { time: '25min', count: 8, color: 'bg-green-500', label: '' },
            { time: '30min', count: 4, color: 'bg-green-400', label: '' },
            { time: '35min', count: 3, color: 'bg-orange-500', label: 'Trop Lent' },
            { time: '40min', count: 2, color: 'bg-orange-400', label: '' }
        ].map((item, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
                <div className={`${item.color} w-full rounded-t-lg transition-all duration-500`} style={{ height: `${item.count * 30}px` }}></div>
                <span className="text-xs text-gray-400 mt-2">{item.time}</span>
            </div>
        ))}
    </div>
);

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

// Helper function to calculate question difficulty
function calculateQuestionDifficulty(results: QuizResult[]) {
    // This would calculate actual statistics from results
    // For now returning mock data
    return [];
}

export default AdvancedAnalytics;
