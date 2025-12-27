import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ChevronRight, ChevronLeft, Save, AlertCircle, FileText, FileSearch, X, ZoomIn, LineChart, Terminal, ShieldCheck, Cpu, Volume2, StopCircle } from 'lucide-react';
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
    const [briefingData, setBriefingData] = useState<{ title: string; message: string; image?: string; scholar?: string; scholarMessage?: string; imageStyle?: string } | null>(null);
    const [viewedBriefings, setViewedBriefings] = useState<Set<string>>(new Set());
    const [isSpeaking, setIsSpeaking] = useState(false);

    const handleSpeak = (text: string) => {
        if (!text) return;

        // Stop any current speech
        window.speechSynthesis.cancel();

        if (isSpeaking) {
            setIsSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.pitch = 0.65; // Deep voice for ancient scholar
        utterance.rate = 0.85; // Slow, deliberate pace

        // Try to find a French voice
        const voices = window.speechSynthesis.getVoices();
        const frenchVoice = voices.find(v => v.lang.includes('fr'));
        if (frenchVoice) utterance.voice = frenchVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // Clean up speech on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const insertSymbol = (value: string) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        if (value === 'CLEAR') {
            handleExerciseAnswer("");
            return;
        }

        const newValue = text.substring(0, start) + value + text.substring(end);

        handleExerciseAnswer(newValue);

        // Reset focus and cursor position after state update
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + value.length, start + value.length);
        }, 0);
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const urlDiscipline = urlParams.get('discipline');
        const isPractice = mode === 'practice';

        let discipline = localStorage.getItem('selectedDiscipline');
        if (!discipline && urlDiscipline) {
            discipline = urlDiscipline;
            localStorage.setItem('selectedDiscipline', urlDiscipline);
        }

        // Set time limit based on discipline
        const disciplineTimeLimit = discipline === 'explosions' ? 7200 : 3600; // 2 hours for explosions, 1 hour for others
        setTimeLimit(disciplineTimeLimit);
        setTimeLeft(disciplineTimeLimit);

        const studentInfo = localStorage.getItem('studentInfo');

        if (!discipline || !studentInfo) {
            navigate('/');
            return;
        }

        setStudentData(JSON.parse(studentInfo));

        const fetchQuizData = async () => {
            try {
                const fileName = isPractice ? `${discipline}_practice.json` : `quiz_data_${discipline === 'explosions' ? 'explosions_v2' : discipline}.json`;
                const response = await fetch(`/${fileName}?t=${Date.now()}`);
                if (!response.ok) throw new Error('Failed to load quiz data');
                const data: QuizData = await response.json();
                setQuizData(data);

                // Flatten questions from sections if they exist
                let allQuestions: Question[] = [];
                if (data.sections) {
                    data.sections.forEach(section => {
                        if (section.type === 'exercise') {
                            // Split sub-questions into individual items
                            const subQs = section.questions || [];
                            subQs.forEach((subQ: any) => {
                                allQuestions.push({
                                    id: `${section.id}_${subQ.id}`,
                                    subId: subQ.id,
                                    parentId: section.id,
                                    question: subQ.question,
                                    points: subQ.points,
                                    type: 'exercise',
                                    title: section.title,
                                    description: section.description,
                                    context: section.context,
                                    sectionDescription: section.description,
                                    sectionContext: section.context,
                                    data: section.data,
                                    sectionTitle: section.title,
                                    validation: subQ.validation,
                                    images: (section as any).images ? (section as any).images : ((section as any).image_url ? [(section as any).image_url] : [])
                                });
                            });
                        } else {
                            // QCM Section: Add individual questions
                            if (section.questions) {
                                section.questions.forEach(q => {
                                    allQuestions.push({
                                        ...q,
                                        type: 'qcm',
                                        sectionTitle: section.title,
                                        sectionDescription: section.description,
                                        sectionContext: (section as any).context,
                                        points: q.points || 0.5
                                    });
                                });
                            }
                        }
                    });
                } else if (data.questions) {
                    // Legacy flat structure
                    allQuestions = data.questions.map(q => ({
                        ...q,
                        type: 'qcm',
                        points: q.points || 0.5
                    }));
                }

                setFlattenedQuestions(allQuestions);
                setAnswers(new Array(allQuestions.length).fill(null));
                setLoading(false);

                timerRef.current = window.setInterval(() => {
                    setTimeLeft(prev => {
                        if (prev % 20 === 0 && prev !== timeLimit) {
                            setShouldPulseSubject(true);
                            setTimeout(() => setShouldPulseSubject(false), 3000); // Pulse for 3 seconds
                        }
                        if (prev <= 1) {
                            clearInterval(timerRef.current!);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

            } catch (error) {
                console.error(error);
                alert('Erreur lors du chargement du quiz.');
                navigate('/');
            }
        };

        fetchQuizData();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [navigate]);

    useEffect(() => {
        if (timeLeft === 0 && quizData) {
            finishQuiz(answers);
        }
    }, [timeLeft]);

    // Handle Section Briefings
    useEffect(() => {
        if (flattenedQuestions.length > 0 && currentQuestionIndex < flattenedQuestions.length) {
            const currentQ = flattenedQuestions[currentQuestionIndex];
            const currentPart = currentQ.sectionTitle || "";

            if (currentPart && !viewedBriefings.has(currentPart)) {
                const description = (currentQ as any).sectionDescription || "";

                // Get scholar info from the section data
                const sectionId = currentQ.parentId || (currentQ as any).sectionId;
                const section = quizData?.sections?.find(s => s.id === sectionId || s.title === currentPart);

                const briefingImage = (section as any)?.briefingImage;
                const briefingScholar = (section as any)?.briefingScholar;
                const scholarMessage = (section as any)?.scholarMessage;
                const imageStyle = (section as any)?.imageStyle;

                let briefingTitle = `BRIEFING OFFICIEL : ${currentPart.replace('Partie', 'SÉQUENCE').toUpperCase()}`;
                let briefingText = description;

                setBriefingData({
                    title: briefingTitle,
                    message: briefingText,
                    image: briefingImage,
                    scholar: briefingScholar,
                    scholarMessage: scholarMessage,
                    imageStyle: imageStyle
                });
                setShowBriefing(true);
                setViewedBriefings(prev => {
                    const next = new Set(prev);
                    next.add(currentPart);
                    return next;
                });
            }
        }
    }, [currentQuestionIndex, flattenedQuestions, viewedBriefings, quizData]);

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (index: number) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = index;
        setAnswers(newAnswers);
    };

    const handleExerciseAnswer = (value: string) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = value;
        setAnswers(newAnswers);
    };

    const goToQuestion = (index: number) => {
        setCurrentQuestionIndex(index);
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < flattenedQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const finishQuiz = async (finalAnswers: any[]) => {
        if (timerRef.current) clearInterval(timerRef.current);

        // Calculate score (Only for QCMs for now, Exercises need manual grading or complex logic)
        let earnedPoints = 0;
        let totalPoints = 0;
        let manualScores: Record<string, number> = {};

        flattenedQuestions.forEach((q, index) => {
            const studentAnswer = finalAnswers[index];
            const maxPoints = q.points || 0;
            totalPoints += maxPoints;

            if (q.type === 'exercise' && studentAnswer) {
                let questionScore = 0;
                const subAnswer = String(studentAnswer);

                if (q.validation) {
                    if (q.validation.type === 'split_criteria') {
                        let points = 0;
                        const keywords = q.validation.keywords || q.validation.values || [];
                        if (q.validation.formulas) keywords.push(...q.validation.formulas);

                        let matchCount = 0;
                        keywords.forEach((val: string) => {
                            if (subAnswer.toLowerCase().includes(val.toLowerCase())) {
                                matchCount++;
                            }
                        });

                        if (q.validation.partial && keywords.length > 0) {
                            points = (matchCount / keywords.length) * maxPoints;
                        } else {
                            points = matchCount === keywords.length ? maxPoints : 0;
                        }
                        questionScore = points;

                    } else if (q.validation.type === 'numeric_set' || q.validation.type === 'numeric') {
                        const tolerance = q.validation.tolerance || 0.02;
                        const parts = q.validation.parts || (q.validation.value !== undefined ? [{ value: q.validation.value }] : []);

                        const sent = subAnswer.replace(/,/g, '.');
                        const numbersFound = sent.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];

                        let partsPassed = 0;
                        parts.forEach((part: any) => {
                            const expected = part.value;
                            const foundMatch = numbersFound.some((num: number) => {
                                const diff = Math.abs(num - expected);
                                const allowedDiff = Math.abs(expected * tolerance);
                                return diff <= (allowedDiff + 1e-6);
                            });

                            if (foundMatch) {
                                partsPassed++;
                            }
                        });

                        if (parts.length > 0) {
                            questionScore = (partsPassed / parts.length) * maxPoints;
                        }
                    } else {
                        const values = q.validation.values || [];
                        let matchCount = 0;
                        values.forEach((val: string) => {
                            if (subAnswer.toLowerCase().includes(val.toLowerCase())) {
                                matchCount++;
                            }
                        });

                        if (q.validation.partial) {
                            questionScore = (matchCount / values.length) * maxPoints;
                        } else {
                            questionScore = matchCount === values.length ? maxPoints : 0;
                        }
                    }

                    questionScore = Math.min(questionScore, maxPoints);
                }

                if (q.parentId) {
                    manualScores[q.parentId] = (manualScores[q.parentId] || 0) + questionScore;
                }
                earnedPoints += questionScore;

            } else if (q.type === 'qcm') {
                if (studentAnswer === q.correctAnswer) {
                    earnedPoints += maxPoints;
                }
            }
        });

        const finalScoreOn20 = totalPoints > 0 ? (earnedPoints / totalPoints) * 20 : 0;
        const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
        const timeElapsed = timeLimit - timeLeft;

        const urlParams = new URLSearchParams(window.location.search);
        const isPractice = urlParams.get('mode') === 'practice';

        const resultData = {
            discipline: localStorage.getItem('selectedDiscipline'),
            student: studentData || JSON.parse(localStorage.getItem('studentInfo') || '{}'),
            answers: finalAnswers,
            score: scorePercentage,
            scoreOn20: finalScoreOn20,
            totalQuestions: flattenedQuestions.length,
            correctCount: 0,
            timeElapsed: timeElapsed,
            timestamp: Date.now(),
            isPractice: isPractice,
            manualScores: manualScores,
            needsGrading: false // Auto-graded!
        };

        localStorage.setItem('lastQuizResult', JSON.stringify(resultData));

        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        history.push(resultData);
        localStorage.setItem('quizHistory', JSON.stringify(history));

        try {
            await fetch('/api/submit-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultData)
            });
        } catch (error) {
            console.error("Failed to submit results to server:", error);
        }

        navigate('/results');
    };

    if (loading || !quizData) {
        return <div className="min-h-screen flex items-center justify-center bg-military-gray text-white">Chargement...</div>;
    }

    const currentQuestion = flattenedQuestions[currentQuestionIndex];
    const answeredCount = answers.filter(a => a !== null && a !== '').length;
    const progressPercentage = (answeredCount / flattenedQuestions.length) * 100;
    const discipline = localStorage.getItem('selectedDiscipline');
    // For explosions: red at 20 minutes (1200s), for others: red at 5 minutes (300s)
    const warningThreshold = discipline === 'explosions' ? 1200 : 300;
    const isTimeRunningOut = timeLeft < warningThreshold;
    // Blinking in last 10 minutes
    const isBlinking = timeLeft < 600;

    // Show time-over modal when time reaches 0
    if (timeLeft === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
                <div className="bg-white rounded-2xl p-12 max-w-2xl mx-4 text-center shadow-2xl">
                    <div className="mb-6">
                        <Clock className="w-24 h-24 mx-auto text-red-600 animate-pulse" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">Temps écoulé</h1>
                    <p className="text-xl text-gray-600 mb-2">
                        Vos réponses vont être automatiquement soumises.
                    </p>
                    <p className="text-2xl font-bold text-military-green mt-6">Bonne Chance ! 🍀</p>
                    <div className="mt-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-military-green mx-auto"></div>
                        <p className="text-gray-500 mt-4">Soumission en cours...</p>
                    </div>
                </div>
            </div>
        );
    }

    // --- Tactical Briefing UI ---
    if (showBriefing && briefingData) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 overflow-hidden">
                {/* Background Grid Effect */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #06b6d4 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                {/* Ambient Particles/Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950/60 to-slate-950 pointer-events-none"></div>

                <div className="max-w-[90vw] w-full space-y-6 relative z-10 flex flex-col h-[90vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4 shrink-0">
                        <div className="flex items-center space-x-6">
                            <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/50 animate-pulse">
                                <Terminal className="w-10 h-10 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-cyan-500 font-mono text-sm tracking-[0.3em] font-black uppercase mb-1">
                                    Transmission Entrante
                                </h2>
                                <h1 className="text-4xl text-white font-black tracking-tight uppercase shadow-cyan- glow">
                                    {briefingData.title}
                                </h1>
                            </div>
                        </div>
                        <div className="flex space-x-8 text-xs font-mono text-slate-500 uppercase tracking-widest hidden md:flex">
                            <div className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-green-500" /> Canal Sécurisé</div>
                            <div className="flex items-center"><Cpu className="w-4 h-4 mr-2 text-cyan-500" /> Liaison Historique</div>
                        </div>
                    </div>

                    {/* Main Content Area - Split View */}
                    <div className="flex-grow flex flex-col md:flex-row gap-12 overflow-hidden items-center justify-center">

                        {/* LEFT: Scholar Hologram */}
                        {briefingData.image && (
                            <div className="w-full md:w-1/2 flex flex-col items-center justify-center relative group h-full">
                                <div className="relative w-full aspect-square max-w-[600px] max-h-[600px] flex items-center justify-center">
                                    {/* Hologram Rings */}
                                    <div className="absolute inset-0 border-[4px] border-cyan-500/30 rounded-full animate-[spin_10s_linear_infinite] border-t-cyan-400 border-l-transparent border-r-transparent"></div>
                                    <div className="absolute inset-6 border-[2px] border-cyan-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>

                                    {/* Image Container - Zoomed for Head-Only Portrait - GROUP for Hover */}
                                    <div className="absolute inset-4 rounded-3xl overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_80px_rgba(6,182,212,0.4)] bg-slate-900/80 backdrop-blur-sm group cursor-help">
                                        <img
                                            src={briefingData.image}
                                            alt="Scholar"
                                            className={`w-full h-full object-cover opacity-90 mix-blend-luminosity filter contrast-125 brightness-110 transition-transform duration-700 group-hover:scale-[1.4] group-hover:brightness-125 ${briefingData.imageStyle || 'object-top scale-[1.35] origin-top translate-y-4'}`}
                                        />
                                        {/* Scanline Overlay on Image */}
                                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(6,182,212,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

                                        {/* HOVER OVERLAY - Message from Scholar */}
                                        {briefingData.scholarMessage && (
                                            <div className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-10 bg-gradient-to-t from-black/90 via-slate-900/60 to-transparent p-6">
                                                <div className="bg-slate-950/70 border border-cyan-500/40 backdrop-blur-md rounded-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.2)] transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 w-full mb-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center">
                                                            <Terminal className="w-3 h-3 mr-1" /> MESSAGE PRIORITAIRE
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSpeak(briefingData.scholarMessage || '');
                                                            }}
                                                            className={`p-1.5 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500 animate-pulse' : 'bg-transparent text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
                                                            title={isSpeaking ? "Arrêter la transmission" : "Écouter le message"}
                                                        >
                                                            {isSpeaking ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                    <p className="text-cyan-50 font-mono text-sm leading-relaxed text-shadow-sm">
                                                        "{briefingData.scholarMessage}"
                                                    </p>
                                                    {isSpeaking && (
                                                        <div className="flex items-center justify-center gap-1 mt-2 h-2">
                                                            <div className="w-0.5 h-full bg-cyan-500 animate-[music_1s_ease-in-out_infinite]"></div>
                                                            <div className="w-0.5 h-full bg-cyan-500 animate-[music_1.1s_ease-in-out_infinite]"></div>
                                                            <div className="w-0.5 h-full bg-cyan-500 animate-[music_1.2s_ease-in-out_infinite]"></div>
                                                            <div className="w-0.5 h-full bg-cyan-500 animate-[music_0.9s_ease-in-out_infinite]"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Scholar Identification */}
                                {briefingData.scholar && (
                                    <div className="mt-8 text-center animate-fade-in-up z-20 bg-slate-950/50 px-6 py-2 rounded-full border border-cyan-500/30 backdrop-blur-md">
                                        <h3 className="text-cyan-300 font-bold text-3xl tracking-wide font-mono shadow-black drop-shadow-xl">
                                            {briefingData.scholar.split(' - ')[0]}
                                        </h3>
                                        <p className="text-cyan-500/90 text-sm font-bold tracking-[0.2em] uppercase mt-2">
                                            {briefingData.scholar.split(' - ')[1]}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* RIGHT: Text Content */}
                        <div className={`bg-slate-900/60 rounded-3xl border border-slate-700 backdrop-blur-2xl shadow-2xl flex flex-col relative overflow-hidden h-full max-h-[70vh] ${briefingData.image ? 'w-full md:w-1/2' : 'w-full'}`}>
                            {/* Decorative corner accents */}
                            <div className="absolute top-0 right-0 p-4">
                                <div className="w-20 h-20 border-t-4 border-r-4 border-cyan-500/40 rounded-tr-2xl"></div>
                            </div>
                            <div className="absolute bottom-0 left-0 p-4">
                                <div className="w-20 h-20 border-b-4 border-l-4 border-cyan-500/40 rounded-bl-2xl"></div>
                            </div>

                            <div className="p-10 md:p-14 flex-grow font-mono text-xl md:text-2xl leading-loose text-cyan-50 text-shadow overflow-y-auto custom-scrollbar flex items-center">
                                <div className="w-full">
                                    <Typewriter text={briefingData.message} speed={15} />
                                    <span className="inline-block w-3 h-8 bg-cyan-400 ml-2 animate-pulse align-middle"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end items-center pt-4 shrink-0">
                        <button
                            onClick={() => setShowBriefing(false)}
                            className="bg-cyan-600/20 hover:bg-cyan-500/40 border-2 border-cyan-500/60 text-cyan-200 hover:text-white px-16 py-6 rounded-2xl font-black text-xl tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.25)] flex items-center group backdrop-blur-md hover:shadow-cyan-500/20"
                        >
                            ACCUSER RÉCEPTION
                            <ChevronRight className="w-8 h-8 ml-4 group-hover:translate-x-2 transition-transform" />
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
