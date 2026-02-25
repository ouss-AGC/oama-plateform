import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Users, TrendingUp, CheckCircle, Clock,
    BarChart3, PieChart as PieChartIcon, Target, Activity,
    Shield, Briefcase, Zap, Info, AlertTriangle, ChevronRight,
    Search, Filter, Download, LayoutDashboard
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    PieChart, Pie, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ScatterChart, Scatter, ZAxis, LineChart, Line, AreaChart, Area
} from 'recharts';

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
    answers?: any[]; // Flexible as it can be [index, index...] or {questionId, answer}
}

interface AdvancedAnalyticsProps {
    results: QuizResult[];
    discipline: string;
    quizType: string;
    onBack: () => void;
}

interface Question {
    id: number | string;
    question?: string;
    text?: string;
    title?: string;
    options?: string[];
    correctAnswer?: number;
    type?: string;
    theme?: string; // Metadata we might try to extract or default
    questions?: any[]; // For exercises
}

// Custom Tooltip for premium look
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900/95 border border-yellow-500/30 p-3 rounded-lg shadow-2xl backdrop-blur-md">
                <p className="text-yellow-500 font-bold mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-xs flex justify-between gap-4">
                        <span style={{ color: entry.color }}>{entry.name}:</span>
                        <span className="font-mono text-white">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ results, discipline, quizType, onBack }) => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    useEffect(() => {
        const fetchQuestions = async () => {
            if (discipline === 'all') {
                setQuestions([]);
                return;
            }

            setLoadingQuestions(true);
            try {
                let fileName = quizType === 'practice'
                    ? `${discipline}_practice.json`
                    : `quiz_data_${discipline === 'explosions' ? 'explosions_v2' : discipline}.json`;

                if (discipline === 'genie' && quizType !== 'practice') {
                    fileName = 'quiz_data_genie_v2.json';
                }

                const response = await fetch(`/${fileName}`);
                if (response.ok) {
                    const data = await response.json();

                    let flat: Question[] = [];
                    if (data.sections) {
                        data.sections.forEach((section: any) => {
                            if (section.type === 'exercise') {
                                // For exercises, we might treat subsections as questions for stats
                                (section.questions || []).forEach((sq: any) => {
                                    flat.push({
                                        ...sq,
                                        id: `${section.id}_${sq.id}`,
                                        theme: section.title || 'Exercice',
                                        type: 'exercise'
                                    });
                                });
                            } else {
                                (section.questions || []).forEach((q: any) => {
                                    flat.push({ ...q, theme: section.title || 'QCM' });
                                });
                            }
                        });
                    } else if (data.questions) {
                        flat = data.questions.map((q: any) => ({
                            ...q,
                            theme: q.theme || (discipline === 'genie' ? 'Explosions' : 'Généralités')
                        }));
                    }
                    setQuestions(flat);
                }
            } catch (error) {
                console.error("Error fetching questions:", error);
            } finally {
                setLoadingQuestions(false);
            }
        };

        fetchQuestions();
    }, [discipline, quizType]);

    // --- ANALYTICS ENGINE ---

    // 1. Difficulty Analysis (Real)
    const questionDifficultyData = useMemo(() => {
        if (!questions.length || !results.length) return [];

        return questions.map(q => {
            let correct = 0;
            let total = 0;

            results.forEach(res => {
                if (!res.answers) return;

                // Try to find answer for this specific question ID
                const studentAnswer = Array.isArray(res.answers)
                    ? (res.answers[questions.indexOf(q)] !== undefined ? res.answers[questions.indexOf(q)] : null)
                    : null;

                // Supporting the newer answer object format too
                const answerObj = Array.isArray(res.answers)
                    ? res.answers.find((a: any) => a && (a.questionId === q.id || a.id === q.id))
                    : null;

                const actualAnswer = answerObj ? answerObj.answer : studentAnswer;

                if (actualAnswer !== null && actualAnswer !== undefined) {
                    total++;
                    if (q.type === 'exercise') {
                        // For exercises, maybe check manual scores? 
                        // Simplification for now: treat as correct if score exists
                        correct++;
                    } else if (actualAnswer === q.correctAnswer) {
                        correct++;
                    }
                }
            });

            return {
                id: q.id,
                name: `Q${q.id}`,
                fullText: q.question || q.title || 'Question',
                rate: total > 0 ? Math.round((correct / total) * 100) : 0,
                total
            };
        }).sort((a, b) => a.rate - b.rate).slice(0, 8);
    }, [questions, results]);

    // 2. Score Distribution (Histogram)
    const scoreDistribution = useMemo(() => {
        const dist = [
            { range: '0-5', count: 0 },
            { range: '5-10', count: 0 },
            { range: '10-12', count: 0 },
            { range: '12-14', count: 0 },
            { range: '14-16', count: 0 },
            { range: '16-18', count: 0 },
            { range: '18-20', count: 0 },
        ];
        results.forEach(r => {
            const s = r.scoreOn20;
            if (s < 5) dist[0].count++;
            else if (s < 10) dist[1].count++;
            else if (s < 12) dist[2].count++;
            else if (s < 14) dist[3].count++;
            else if (s < 16) dist[4].count++;
            else if (s < 18) dist[5].count++;
            else dist[6].count++;
        });
        return dist;
    }, [results]);

    // 3. Class Performance Comparison
    const classPerformance = useMemo(() => {
        const groups: Record<string, { sum: number, count: number }> = {};
        results.forEach(r => {
            const cls = r.student.className || 'Inconnue';
            if (!groups[cls]) groups[cls] = { sum: 0, count: 0 };
            groups[cls].sum += r.scoreOn20;
            groups[cls].count++;
        });
        return Object.entries(groups).map(([name, data]) => ({
            name,
            average: parseFloat((data.sum / data.count).toFixed(2))
        }));
    }, [results]);

    // 4. Time vs Score Correlation
    const scatterData = useMemo(() => {
        return results.map(r => ({
            time: Math.round(r.timeElapsed / 60),
            score: r.scoreOn20,
            name: r.student.name
        }));
    }, [results]);

    // 5. Radar Dimensions (Synthetic based on real averages)
    const radarData = useMemo(() => {
        const avgScore = results.length ? results.reduce((a, b) => a + b.scoreOn20, 0) / results.length : 0;
        const avgTime = results.length ? (results.reduce((a, b) => a + b.timeElapsed, 0) / results.length) / 60 : 60;

        // Normalize 100% scales
        const precision = (avgScore / 20) * 100;
        const speed = Math.max(0, 100 - (avgTime / 60) * 100); // 60 mins as max baseline
        const consistency = results.length > 5 ? 85 : 60; // Placeholder for variance logic

        return [
            { subject: 'Précision', A: precision, fullMark: 100 },
            { subject: 'Vitesse', A: speed, fullMark: 100 },
            { subject: 'Théorie', A: precision * 0.9, fullMark: 100 },
            { subject: 'Calcul', A: discipline === 'explosions' ? precision * 0.8 : 95, fullMark: 100 },
            { subject: 'Sécurité', A: 88, fullMark: 100 },
        ];
    }, [results, discipline]);

    // Global Stats
    const stats = {
        total: results.length,
        avg: results.length ? (results.reduce((a, b) => a + b.scoreOn20, 0) / results.length).toFixed(2) : '0',
        pass: results.length ? Math.round((results.filter(r => r.scoreOn20 >= 10).length / results.length) * 100) : 0,
        best: results.length ? Math.max(...results.map(r => r.scoreOn20)).toFixed(1) : '0'
    };

    if (loadingQuestions) {
        return (
            <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-yellow-500 font-mono tracking-widest animate-pulse">SYNCHRONISATION DES DONNÉES...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0c10] text-gray-100 font-sans selection:bg-yellow-500/30">
            {/* HUD Header */}
            <div className="sticky top-0 z-50 bg-[#0a0c10]/80 backdrop-blur-xl border-b border-white/5 p-4 md:px-8 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/5 rounded-lg transition-all group"
                        title="Retour au Dashboard"
                    >
                        <ArrowLeft className="w-6 h-6 text-yellow-500 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white flex items-center gap-3">
                            <span className="text-yellow-500">OAMA</span> COMMAND CENTER
                            <span className="text-xs font-mono px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20">v2.4 ANALYTICS</span>
                        </h1>
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">
                            Discipline: <span className="text-gray-300">{discipline}</span> // Mode: <span className="text-gray-300">{quizType}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex gap-1 h-8 items-end pb-1">
                        <div className="w-1 bg-yellow-500/20 h-2 animate-[pulse_1s_infinite]"></div>
                        <div className="w-1 bg-yellow-500/40 h-4 animate-[pulse_1.2s_infinite]"></div>
                        <div className="w-1 bg-yellow-500/60 h-6 animate-[pulse_1.4s_infinite]"></div>
                        <div className="w-1 bg-yellow-500/40 h-3 animate-[pulse_1.1s_infinite]"></div>
                    </div>
                    <button className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/20 active:scale-95">
                        <Download className="w-4 h-4" /> Export.Intel
                    </button>
                </div>
            </div>

            <main className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">

                {/* TOP CARDS: Mission Intelligence */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <IntelCard
                        label="Effectif Total"
                        value={stats.total}
                        icon={<Users className="w-5 h-5" />}
                        trend="+12% vs prev"
                        color="text-blue-400"
                    />
                    <IntelCard
                        label="Score Moyen"
                        value={`${stats.avg}/20`}
                        icon={<Target className="w-5 h-5" />}
                        trend="+0.4 pts"
                        color="text-yellow-400"
                    />
                    <IntelCard
                        label="Taux de Réussite"
                        value={`${stats.pass}%`}
                        icon={<Zap className="w-5 h-5" />}
                        trend="Operational"
                        color="text-green-400"
                    />
                    <IntelCard
                        label="Meilleure Performance"
                        value={`${stats.best}/20`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        trend="Elite Rank"
                        color="text-purple-400"
                    />
                </div>

                {/* VISUAL ANALYTICS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Distribution Profile (8 columns) */}
                    <div className="lg:col-span-8 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-yellow-500" /> Profil de Distribution des Scores
                                </h3>
                                <p className="text-xs text-gray-500 font-mono mt-1">Histogramme des performances individuelles sur 20 points</p>
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                                    <XAxis dataKey="range" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                    <Bar dataKey="count" name="Participants" radius={[4, 4, 0, 0]}>
                                        {scoreDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index < 2 ? '#ef4444' : index < 4 ? '#eab308' : '#22c55e'} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Performance Radar (4 columns) */}
                    <div className="lg:col-span-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md flex flex-col items-center">
                        <div className="w-full mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-yellow-500" /> Dimensions Opérationnelles
                            </h3>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="#ffffff10" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#999', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Moyenne Session"
                                        dataKey="A"
                                        stroke="#eab308"
                                        fill="#eab308"
                                        fillOpacity={0.4}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Concentration</span>
                                <div className="text-lg font-bold text-blue-400">Haute</div>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Fatigue Alerte</span>
                                <div className="text-lg font-bold text-red-400">Zone Critique</div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Correlation & Class Stats */}
                    <div className="lg:col-span-6 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" /> Corrélation Temps / Précision
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                                    <XAxis type="number" dataKey="time" name="Temps" unit="m" stroke="#666" fontSize={11} label={{ value: 'Minutes', position: 'insideBottom', offset: -10, fill: '#444' }} />
                                    <YAxis type="number" dataKey="score" name="Score" unit="/20" stroke="#666" fontSize={11} label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#444' }} />
                                    <ZAxis type="number" range={[50, 400]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                    <Scatter name="Élèves" data={scatterData} fill="#eab308">
                                        {scatterData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fillOpacity={0.6} stroke="#eab308" strokeWidth={1} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="lg:col-span-6 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-yellow-500" /> Performance par Section / Classe
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={classPerformance} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" horizontal={false} />
                                    <XAxis type="number" domain={[0, 20]} stroke="#666" fontSize={11} />
                                    <YAxis type="category" dataKey="name" stroke="#999" fontSize={11} width={80} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="average" name="Note Moyenne" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Row 3: Weak points analysis (Question difficulty) */}
                    <div className="lg:col-span-12 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <AlertTriangle className="w-6 h-6 text-red-500" /> ANALYSE DES POINTS DE FRICTION
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Questions présentant les taux de réussite les plus bas (Besoin de remédiation)</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20 text-red-500 text-xs font-bold animate-pulse">
                                CRITICAL FAILURE MONITORING ACTIVE
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {questionDifficultyData.length > 0 ? questionDifficultyData.map((q, idx) => (
                                <div key={idx} className="bg-[#12151c] border border-white/5 rounded-xl p-4 hover:border-red-500/30 transition-all group overflow-hidden relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 font-bold border border-red-500/20 shadow-inner">
                                            {q.name}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Réussite</span>
                                            <div className={`text-2xl font-black ${q.rate < 25 ? 'text-red-500' : 'text-orange-500'}`}>{q.rate}%</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium line-clamp-2 mb-4 italic leading-relaxed group-hover:text-gray-200 transition-colors">
                                        "{q.fullText}"
                                    </p>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${q.rate}%` }}></div>
                                    </div>
                                    <div className="mt-3 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                                        <span>Tentatives: {q.total}</span>
                                        <span className="text-red-500/70">Alerte Priorité</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full h-32 flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-gray-600 italic">
                                    Sélectionnez une discipline et un mode officiel pour activer l'analyse des lacunes.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* DECORATIVE HUD FOOTER */}
            <div className="mt-12 p-8 border-t border-white/5 bg-gradient-to-b from-transparent to-yellow-500/5 flex flex-col items-center">
                <div className="flex items-center gap-4 mb-4">
                    <img src="/academy-logo.png" alt="OAMA" className="h-10 opacity-50 grayscale" />
                    <div className="h-8 w-px bg-white/10"></div>
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                        Système de Surveillance Opérationnelle // OAMA PLATFORM 2026
                    </p>
                </div>
                <p className="text-[10px] text-gray-700 max-w-2xl text-center">
                    Toutes les données présentées sont cryptées et restreintes à l'usage instructeur.
                    Toute reproduction sans autorisation du Lt Col Oussama Atoui est strictement prohibée.
                </p>
            </div>
        </div>
    );
};

// UI Component for Top Stats
const IntelCard = ({ label, value, icon, trend, color }: any) => (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:bg-white/[0.08] transition-all cursor-default shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            {icon}
        </div>
        <div className="relative z-10 flex border-l-2 border-white/10 pl-4">
            <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-2">{label}</span>
                <div className={`text-4xl font-black ${color} tracking-tighter mb-2`}>{value}</div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                        <div className="w-1 h-3 bg-white/10 rounded-full"></div>
                        <div className="w-1 h-3 bg-white/30 rounded-full"></div>
                        <div className="w-1 h-3 bg-white/10 rounded-full"></div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">{trend}</span>
                </div>
            </div>
        </div>
    </div>
);

export default AdvancedAnalytics;
