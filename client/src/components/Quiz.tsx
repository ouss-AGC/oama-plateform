import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ChevronRight, ChevronLeft, Save, AlertCircle, FileText, FileSearch, X, ZoomIn, LineChart, Terminal, ShieldCheck, Cpu } from 'lucide-react';
import ExamPDFViewer from './ExamPDFViewer';
import ImageZoom from './ImageZoom';


// Enhanced Interfaces
interface SubQuestion {
    id: string;
    question: string;
    points: number;
}

interface Question {
    id: number | string;
    question: string;
    options?: string[]; // For QCM
    correctAnswer?: number; // For QCM
    type?: 'qcm' | 'exercise';
    image?: string;
    images?: string[];
    // For Exercise
    title?: string;
    description?: string;
    context?: string;
    data?: any;
    subId?: string; // For exercise sub-questions
    parentId?: string; // Original section ID
    points?: number;
    validation?: any;
    sectionTitle?: string; // To display section info
    sectionDescription?: string;
    sectionContext?: string;
}

interface Section {
    id: string;
    title: string;
    description: string;
    type?: 'qcm' | 'exercise';
    questions?: Question[]; // For QCM section
    context?: string; // For Exercise section
    data?: any; // For Exercise section
}

interface QuizData {
    title: string;
    questions?: Question[]; // Legacy flat structure
    sections?: Section[]; // New section-based structure
}

const Quiz: React.FC = () => {
    const navigate = useNavigate();
    const [quizData, setQuizData] = useState<QuizData | null>(null);
    const [flattenedQuestions, setFlattenedQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
    // Answers state: number for QCM, string for Exercises
    const [answers, setAnswers] = useState<(number | string | null)[]>([]);
    const [timeLeft, setTimeLeft] = useState(3600);
    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);
    const [timeLimit, setTimeLimit] = useState(3600); // Dynamic time limit
    const [shouldPulseSubject, setShouldPulseSubject] = useState(false);
    const timerRef = useRef<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Briefing states
    const [showBriefing, setShowBriefing] = useState(false);
    const [briefingData, setBriefingData] = useState<{ title: string; message: string; image?: string; scholar?: string } | null>(null);
    const [viewedBriefings, setViewedBriefings] = useState<Set<string>>(new Set());

    // ... (insertSymbol function remains here) ...

    // Handle Section Briefings
    useEffect(() => {
        if (flattenedQuestions.length > 0 && currentQuestionIndex < flattenedQuestions.length) {
            const currentQ = flattenedQuestions[currentQuestionIndex];
            const currentPart = currentQ.sectionTitle || "";

            if (currentPart && !viewedBriefings.has(currentPart)) {
                const description = (currentQ as any).sectionDescription || "";
                const context = (currentQ as any).sectionContext || "";

                // Get scholar info from the section data (requires we propagate it during flattening)
                // Since flattenedQuestions might not have it directly if we didn't map it, we need to ensure it's mapped.
                // Re-checking the flattening logic in fetchQuizData (lines ~135-173) suggests we need to map 'briefingImage' and 'briefingScholar' there too.
                // However, 'currentQ' has properties spreading from the section. Let's assume we update the flattening logic to include these.

                // NOTE: I will update the flattening logic in a separate edit to ensure 'briefingImage' is passed down.
                // For now, let's assume it's available on currentQ or we find the section.
                const sectionId = currentQ.parentId || (currentQ as any).sectionId;
                const section = quizData?.sections?.find(s => s.id === sectionId || s.title === currentPart);

                const briefingImage = (section as any)?.briefingImage; // Access from source section
                const briefingScholar = (section as any)?.briefingScholar;

                let briefingTitle = `BRIEFING OFFICIEL : ${currentPart.replace('Partie', 'SÉQUENCE').toUpperCase()}`;
                let briefingText = description; // Just description for the typewriter, context can be separate if needed or appended.

                setBriefingData({
                    title: briefingTitle,
                    message: briefingText,
                    image: briefingImage,
                    scholar: briefingScholar
                });
                setShowBriefing(true);
                setViewedBriefings(prev => {
                    const next = new Set(prev);
                    next.add(currentPart);
                    return next;
                });
            }
        }
    }, [currentQuestionIndex, flattenedQuestions, viewedBriefings, quizData]); // Added quizData dependency

    // ... (formatTime, handleOptionSelect etc.) ...

    // --- Tactical Briefing UI ---
    if (showBriefing && briefingData) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 overflow-hidden">
                {/* Background Grid Effect */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #06b6d4 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                {/* Ambient Particles/Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950/60 to-slate-950 pointer-events-none"></div>

                <div className="max-w-6xl w-full space-y-6 relative z-10 flex flex-col h-[85vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4 shrink-0">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/50 animate-pulse">
                                <Terminal className="w-8 h-8 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-cyan-500 font-mono text-xs tracking-[0.3em] font-black uppercase mb-1">
                                    Transmission Entrante
                                </h2>
                                <h1 className="text-3xl text-white font-black tracking-tight uppercase shadow-cyan- glow">
                                    {briefingData.title}
                                </h1>
                            </div>
                        </div>
                        <div className="flex space-x-6 text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden md:flex">
                            <div className="flex items-center"><ShieldCheck className="w-3 h-3 mr-2 text-green-500" /> Canal Sécurisé</div>
                            <div className="flex items-center"><Cpu className="w-3 h-3 mr-2 text-cyan-500" /> Liaison Historique</div>
                        </div>
                    </div>

                    {/* Main Content Area - Split View */}
                    <div className="flex-grow flex flex-col md:flex-row gap-8 overflow-hidden">

                        {/* LEFT: Scholar Hologram */}
                        {briefingData.image && (
                            <div className="w-full md:w-1/3 flex flex-col items-center justify-center relative group">
                                <div className="relative w-full aspect-square max-w-[400px] mx-auto">
                                    {/* Hologram Rings */}
                                    <div className="absolute inset-0 border-[3px] border-cyan-500/30 rounded-full animate-[spin_10s_linear_infinite] border-t-cyan-400 border-l-transparent border-r-transparent"></div>
                                    <div className="absolute inset-4 border-[1px] border-cyan-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>

                                    {/* Image Container */}
                                    <div className="absolute inset-8 rounded-full overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] bg-slate-900/80 backdrop-blur-sm">
                                        <img
                                            src={briefingData.image}
                                            alt="Scholar"
                                            className="w-full h-full object-cover opacity-90 mix-blend-luminosity filter contrast-125 brightness-110"
                                        />
                                        {/* Scanline Overlay on Image */}
                                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(6,182,212,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                                    </div>
                                </div>

                                {/* Scholar Identification */}
                                {briefingData.scholar && (
                                    <div className="mt-6 text-center animate-fade-in-up">
                                        <h3 className="text-cyan-300 font-bold text-xl tracking-wide font-mono shadow-black drop-shadow-lg">
                                            {briefingData.scholar.split(' - ')[0]}
                                        </h3>
                                        <p className="text-cyan-500/70 text-sm font-medium tracking-widest uppercase mt-1">
                                            {briefingData.scholar.split(' - ')[1]}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* RIGHT: Text Content */}
                        <div className={`bg-slate-900/50 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl flex flex-col relative overflow-hidden ${briefingData.image ? 'w-full md:w-2/3' : 'w-full'}`}>
                            {/* Decorative corner accents */}
                            <div className="absolute top-0 right-0 p-4">
                                <div className="w-16 h-16 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-xl"></div>
                            </div>
                            <div className="absolute bottom-0 left-0 p-4">
                                <div className="w-16 h-16 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-xl"></div>
                            </div>

                            <div className="p-10 flex-grow font-mono text-xl leading-loose text-cyan-100/90 text-shadow overflow-y-auto custom-scrollbar">
                                <Typewriter text={briefingData.message} speed={20} />
                                <span className="inline-block w-2 h-6 bg-cyan-400 ml-1 animate-pulse align-middle"></span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end items-center pt-4 shrink-0">
                        <button
                            onClick={() => setShowBriefing(false)}
                            className="bg-cyan-600/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 hover:text-white px-12 py-4 rounded-xl font-bold text-lg tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center group backdrop-blur-md"
                        >
                            ACCUSER RÉCEPTION
                            <ChevronRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-military-green text-white p-4 shadow-md">
                <div className="max-w-[98%] mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <img src="/academy-logo.png" alt="Logo" className="h-10 w-10 mr-3" />
                        <h1 className="font-bold text-lg hidden md:block">{quizData.title}</h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => setIsPdfViewerOpen(true)}
                            className={`bg-yellow-500 text-military-green px-6 py-3 rounded-full flex items-center shadow-lg hover:bg-yellow-400 transition-all font-bold text-2xl ${shouldPulseSubject ? 'animate-bounce ring-4 ring-yellow-300 ring-opacity-50' : ''}`}
                        >
                            <FileSearch className="w-6 h-6 mr-3" />
                            Voir Sujet
                        </button>
                        <div className={`flex items-center px-6 py-3 rounded-full shadow-lg transition-all ${isTimeRunningOut ? 'bg-red-600' : 'bg-green-800'
                            } ${isBlinking ? 'animate-pulse' : ''}`}>
                            <Clock className="w-6 h-6 mr-3" />
                            <span className="font-mono font-bold text-2xl">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                    <div className="text-sm font-medium">
                        {answeredCount} / {flattenedQuestions.length} étapes
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            < div className="w-full bg-gray-300 h-2" >
                <div
                    className="bg-military-beige h-2 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div >

            {/* Time Warning */}
            {
                isTimeRunningOut && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-center">
                        <div className="flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            <span className="font-semibold">
                                Attention ! Il vous reste moins de {discipline === 'explosions' ? '20' : '5'} minutes !
                            </span>
                        </div>
                    </div>
                )
            }

            {/* Main Content */}
            <main className="flex-grow flex p-4 gap-4 max-w-[98%] mx-auto w-full items-start">
                {/* Question Grid Sidebar */}
                <div className="hidden lg:block w-72 bg-white rounded-xl shadow-lg p-5 h-fit sticky top-4 overflow-hidden">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                        <LineChart className="w-5 h-5 mr-2 text-military-green" />
                        Navigation
                    </h3>

                    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
                        {/* Part 1: QCM */}
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b pb-1">Partie 1 : QCM</h4>
                            <div className="grid grid-cols-5 gap-2">
                                {flattenedQuestions.filter(q => q.type === 'qcm').map((q) => {
                                    const index = flattenedQuestions.indexOf(q);
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => goToQuestion(index)}
                                            className={`w-10 h-10 rounded-lg font-bold text-xs transition-all flex items-center justify-center
                                                ${index === currentQuestionIndex
                                                    ? 'bg-military-green text-white ring-2 ring-offset-2 ring-military-green shadow-md'
                                                    : answers[index] !== null
                                                        ? 'bg-green-100 text-green-700 border-2 border-green-200'
                                                        : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200'
                                                }`}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Part 2: Calculs */}
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b pb-1">Partie 2 : Problème</h4>
                            <div className="grid grid-cols-5 gap-2">
                                {flattenedQuestions.filter(q => q.parentId === 'part2').map((q) => {
                                    const index = flattenedQuestions.indexOf(q);
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => goToQuestion(index)}
                                            className={`w-10 h-10 rounded-lg font-bold text-xs transition-all flex items-center justify-center
                                                ${index === currentQuestionIndex
                                                    ? 'bg-blue-600 text-white ring-2 ring-offset-2 ring-blue-600 shadow-md'
                                                    : answers[index] !== null && answers[index] !== ''
                                                        ? 'bg-green-100 text-green-700 border-2 border-green-200'
                                                        : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200'
                                                }`}
                                            title={`Question ${q.subId}`}
                                        >
                                            {q.subId}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Part 3: SDOF */}
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b pb-1">Partie 3 : Analyse SDOF</h4>
                            <div className="grid grid-cols-5 gap-2">
                                {flattenedQuestions.filter(q => q.parentId === 'part3').map((q) => {
                                    const index = flattenedQuestions.indexOf(q);
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => goToQuestion(index)}
                                            className={`w-10 h-10 rounded-lg font-bold text-xs transition-all flex items-center justify-center
                                                ${index === currentQuestionIndex
                                                    ? 'bg-purple-600 text-white ring-2 ring-offset-2 ring-purple-600 shadow-md'
                                                    : answers[index] !== null && answers[index] !== ''
                                                        ? 'bg-green-100 text-green-700 border-2 border-green-200'
                                                        : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200'
                                                }`}
                                            title={`Question ${q.subId}`}
                                        >
                                            {q.subId}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Question Card */}
                <div className="flex-grow bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
                    <div className="p-8 flex-grow overflow-y-auto max-h-[70vh]">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-grow">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {currentQuestion.question}
                                </h2>
                            </div>
                            <div className="flex flex-col items-end ml-4 gap-2">
                                <span className="px-3 py-1 bg-military-green text-white rounded-full text-sm font-bold whitespace-nowrap">
                                    {currentQuestion.points} pts
                                </span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-600 whitespace-nowrap">
                                    {currentQuestion.subId ? `Question ${currentQuestion.subId}` : `Q${currentQuestionIndex + 1}`}
                                </span>
                            </div>
                        </div>

                        {currentQuestion.type === 'exercise' ? (
                            // Exercise View: Prioritized Answer Box First
                            <div className="space-y-6">
                                {/* 1. Answer Box */}
                                <div className="border-l-4 border-military-beige pl-4 py-4 bg-military-beige/5 rounded-r-2xl">
                                    <label className="block text-military-green font-black text-sm uppercase tracking-widest mb-3">
                                        Votre Réponse
                                    </label>
                                    <textarea
                                        ref={textareaRef}
                                        value={answers[currentQuestionIndex] as string || ''}
                                        onChange={(e) => handleExerciseAnswer(e.target.value)}
                                        className="w-full p-5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-military-green/10 focus:border-military-green min-h-[180px] text-lg transition-all shadow-inner bg-white"
                                        placeholder="Saisissez vos calculs, formules et résultats ici..."
                                    />
                                    <div className="mt-3 flex items-center text-xs text-gray-500 italic bg-white/50 p-2 rounded-lg border border-gray-100">
                                        <AlertCircle className="w-3.5 h-3.5 mr-2 text-military-green" />
                                        <span>Utilisez le point (.) comme séparateur décimal (ex: 12.5). Indiquez clairement les unités.</span>
                                    </div>
                                </div>

                                {/* 2. Technical Context & Data */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentQuestion.context && (
                                        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 text-gray-700 text-sm leading-relaxed">
                                            <h4 className="font-black mb-3 text-blue-800 flex items-center text-xs uppercase tracking-wider">
                                                <FileText className="w-4 h-4 mr-2" />
                                                Contexte du Problème
                                            </h4>
                                            {currentQuestion.context}
                                        </div>
                                    )}

                                    {currentQuestion.data && (
                                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 text-sm">
                                            <h4 className="font-black mb-3 text-gray-700 border-b pb-2 text-xs uppercase tracking-wider">Données Techniques</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {Object.entries(currentQuestion.data).map(([key, value]) => (
                                                    <div key={key} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                        <span className="font-semibold text-gray-500 capitalize text-xs">
                                                            {key.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="font-mono font-bold text-military-green">{String(value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Image Display (bottom) */}
                                {(currentQuestion.image || currentQuestion.images) && (
                                    <div className="space-y-6 pt-4 border-t border-dashed border-gray-200">
                                        <h4 className="font-black text-gray-500 text-xs uppercase tracking-wider mb-4">Support Visuel / Graphiques</h4>
                                        {currentQuestion.image && (
                                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center group relative overflow-hidden ring-1 ring-gray-100">
                                                <ImageZoom
                                                    src={currentQuestion.image}
                                                    alt="Figure"
                                                    className="w-full"
                                                />
                                                <div className="mt-4 flex items-center justify-center pointer-events-none">
                                                    <span className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg animate-pulse">
                                                        <LineChart className="w-4 h-4 mr-2" />
                                                        🛠️ Analyser le graphique (Cliquez sur l'image)
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {currentQuestion.images && currentQuestion.images.map((imgUrl: string, idx: number) => (
                                            <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center group relative overflow-hidden ring-1 ring-gray-100">
                                                <ImageZoom
                                                    src={imgUrl}
                                                    alt={`Figure ${idx + 1}`}
                                                    className="w-full"
                                                />
                                                <div className="mt-4 flex items-center justify-center pointer-events-none">
                                                    <span className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg animate-pulse">
                                                        <LineChart className="w-4 h-4 mr-2" />
                                                        🛠️ Analyser la Figure {idx + 1}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!currentQuestion.image && !currentQuestion.images && (
                                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                                        <p className="text-gray-500 italic text-sm">
                                            [Figure / Schéma du dispositif non requis pour cette étape]
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Standard QCM View
                            <div className="space-y-4">
                                {currentQuestion.options?.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleOptionSelect(index)}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between group
                                            ${answers[currentQuestionIndex] === index
                                                ? 'border-military-green bg-green-50 text-military-green shadow-md'
                                                : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="font-medium text-lg">{option}</span>
                                        {answers[currentQuestionIndex] === index && (
                                            <CheckCircle className="w-6 h-6 text-military-green" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div >

                    {/* Footer / Navigation Buttons */}
                    <div className="bg-gray-50 border-t p-6 flex justify-between items-center group">
                        <button
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0}
                            className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all
                                ${currentQuestionIndex === 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-military-green hover:text-military-green shadow-sm'
                                }`}
                        >
                            <ChevronLeft className="w-5 h-5 mr-3" />
                            Précédent
                        </button>

                        <div className="flex gap-3">
                            {currentQuestionIndex < flattenedQuestions.length - 1 ? (
                                <button
                                    onClick={handleNext}
                                    className="bg-military-green text-white px-8 py-3 rounded-xl font-bold flex items-center hover:bg-green-800 transition-all shadow-md active:scale-95"
                                >
                                    Suivant
                                    <ChevronRight className="w-5 h-5 ml-3" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => finishQuiz(answers)}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center hover:bg-blue-700 transition-all shadow-lg animate-pulse ring-2 ring-blue-400 ring-offset-2"
                                >
                                    Terminer l'Examen
                                    <CheckCircle className="w-5 h-5 ml-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Symbol Palette */}
                <div className="hidden lg:block w-80 bg-white rounded-xl shadow-2xl h-fit sticky top-4 overflow-hidden border border-gray-100">
                    <div className="bg-slate-800 p-4 flex items-center justify-between">
                        <h3 className="font-black text-white flex items-center uppercase tracking-widest text-xs">
                            <Save className="w-4 h-4 mr-2 text-cyan-400" />
                            Palette d'Outils
                        </h3>
                        <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold">EXPERT</span>
                    </div>

                    <div className="p-4 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
                        {symbolCategories.map((cat, catIdx) => (
                            <div key={catIdx} className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                    <span className="w-1 h-3 bg-slate-300 mr-2 rounded-full"></span>
                                    {cat.name}
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {cat.items.map((item, itemIdx) => (
                                        <button
                                            key={itemIdx}
                                            onClick={() => insertSymbol(item.value)}
                                            className={`h-12 rounded-xl border-2 text-base font-bold transition-all shadow-sm flex items-center justify-center active:scale-95
                                                ${cat.name.includes('Nombres')
                                                    ? 'bg-white border-slate-200 text-slate-700 hover:border-cyan-500 hover:text-cyan-600 shadow-sm'
                                                    : 'bg-cyan-50 border-cyan-100 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-400'}
                                            `}
                                            title={item.label}
                                        >
                                            {(item as any).display || item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 bg-slate-800/10 border-t border-slate-100">
                        <p className="text-[10px] text-slate-500 text-center font-medium italic">
                            Insertion instantanée au curseur
                        </p>
                    </div>
                </div>
            </main>

            {/* PDF Viewer Modal */}
            {isPdfViewerOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black">
                    <div className="flex justify-between items-center p-4 bg-military-green text-white">
                        <h2 className="font-bold">Sujet d'Examen</h2>
                        <button
                            onClick={() => setIsPdfViewerOpen(false)}
                            className="p-2 hover:bg-green-800 rounded-full transition-all"
                        >
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                    <div className="flex-grow">
                        <ExamPDFViewer
                            pdfUrl={`/resources/exam_explosions_gc31.pdf`}
                            isOpen={isPdfViewerOpen}
                            onClose={() => setIsPdfViewerOpen(false)}
                            studentName={studentData?.nom}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Symbol Palette Data ---
const symbolCategories = [
    {
        name: "Nombres & Opérateurs",
        items: [
            { label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" },
            { label: "4", value: "4" }, { label: "5", value: "5" }, { label: "6", value: "6" },
            { label: "7", value: "7" }, { label: "8", value: "8" }, { label: "9", value: "9" },
            { label: ".", value: "." }, { label: "0", value: "0" }, { label: "C", value: "CLEAR", display: "⌫" },
            { label: "+", value: " + " }, { label: "-", value: " - " }, { label: "=", value: " = " },
            { label: "(", value: "(" }, { label: ")", value: ")" }, { label: "%", value: "%" }
        ]
    },
    {
        name: "Explosion & Choc",
        items: [
            { label: "Pₛ₀", value: "Pₛ₀" },
            { label: "Pᵣ", value: "Pᵣ" },
            { label: "iₛ", value: "iₛ" },
            { label: "iᵣ", value: "iᵣ" },
            { label: "tₐ", value: "tₐ" },
            { label: "u₀_DC", value: "u₀_DC" },
            { label: "q₀", value: "q₀" },
            { label: "Zₐ", value: "Zₐ" },
            { label: "Zᵦ", value: "Zᵦ" },
            { label: "W", value: "W" },
            { label: "R", value: "R" }
        ]
    },
    {
        name: "SDOF & Dynamique",
        items: [
            { label: "xₘₐₓ", value: "xₘₐₓ" },
            { label: "xₑₗ", value: "xₑₗ" },
            { label: "μ", value: "μ" },
            { label: "τ", value: "τ" },
            { label: "ωₙ", value: "ωₙ" },
            { label: "M", value: "M" },
            { label: "K", value: "K" },
            { label: "Rₘ", value: "Rₘ" },
            { label: "P₀", value: "P₀" },
            { label: "t₀", value: "t₀" },
            { label: "t₀բ", value: "t₀բ" },
            { label: "tᵣբ", value: "tᵣբ" }
        ]
    },
    {
        name: "Symboles & Maths",
        items: [
            { label: "≈", value: " ≈ " },
            { label: "≤", value: " ≤ " },
            { label: "≥", value: " ≥ " },
            { label: "×", value: " × " },
            { label: "÷", value: " ÷ " },
            { label: "√", value: "√(" },
            { label: "Δ", value: "Δ" },
            { label: "±", value: " ± " },
            { label: "²", value: "²" }
        ]
    },
    {
        name: "Unités",
        items: [
            { label: "kg", value: " kg" },
            { label: "kPa", value: " kPa" },
            { label: "ms", value: " ms" },
            { label: "kN", value: " kN" },
            { label: "rad/s", value: " rad/s" },
            { label: "kN/m", value: " kN/m" },
            { label: "mm", value: " mm" },
            { label: "s", value: " s" },
            { label: "m/s", value: " m/s" },
            { label: "kPa.ms", value: " kPa.ms" }
        ]
    }
];

// --- Helper Components ---
const Typewriter: React.FC<{ text: string; speed?: number }> = ({ text, speed = 30 }) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        let i = 0;
        setDisplayedText("");
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText((prev) => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return <span>{displayedText}</span>;
};

export default Quiz;
