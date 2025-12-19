import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ChevronRight, ChevronLeft, Save, AlertCircle, FileText, FileSearch, X, ZoomIn, LineChart } from 'lucide-react';
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
    questions?: SubQuestion[]; // Sub-questions for exercise
    sectionTitle?: string; // To display section info
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
    // Answers state: number for QCM, Record<string, string> for Exercise
    const [answers, setAnswers] = useState<(number | Record<string, string> | null)[]>([]);
    const [timeLeft, setTimeLeft] = useState(3600);
    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);
    const [timeLimit, setTimeLimit] = useState(3600); // Dynamic time limit
    const [shouldPulseSubject, setShouldPulseSubject] = useState(false);
    const timerRef = useRef<number | null>(null);

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
                const fileName = isPractice ? `${discipline}_practice.json` : `quiz_data_${discipline}.json`;
                const response = await fetch(`/${fileName}?t=${Date.now()}`);
                if (!response.ok) throw new Error('Failed to load quiz data');
                const data: QuizData = await response.json();
                setQuizData(data);

                // Flatten questions from sections if they exist
                let allQuestions: Question[] = [];
                if (data.sections) {
                    data.sections.forEach(section => {
                        if (section.type === 'exercise') {
                            // Treat the whole section as one "Exercise Question"
                            allQuestions.push({
                                id: section.id,
                                question: section.title, // Use title as main question text
                                type: 'exercise',
                                title: section.title,
                                description: section.description,
                                context: section.context,
                                data: section.data,
                                questions: section.questions as any, // Sub-questions
                                sectionTitle: section.title,
                                images: (section as any).images ? (section as any).images : ((section as any).image_url ? [(section as any).image_url] : [])
                            });
                        } else {
                            // QCM Section: Add individual questions
                            if (section.questions) {
                                section.questions.forEach(q => {
                                    allQuestions.push({ ...q, type: 'qcm', sectionTitle: section.title });
                                });
                            }
                        }
                    });
                } else if (data.questions) {
                    // Legacy flat structure
                    allQuestions = data.questions.map(q => ({ ...q, type: 'qcm' }));
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

    const handleExerciseAnswer = (subQuestionId: string, value: string) => {
        const newAnswers = [...answers];
        const currentAnswer = (newAnswers[currentQuestionIndex] as Record<string, string>) || {};
        newAnswers[currentQuestionIndex] = { ...currentAnswer, [subQuestionId]: value };
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
            if (q.type === 'exercise') {
                // Exercise Scoring
                let questionScore = 0;
                const maxPoints = q.questions?.reduce((sum: number, subQ: any) => sum + subQ.points, 0) || 0;
                totalPoints += maxPoints;

                const studentAnswerObj = finalAnswers[index] || {};

                q.questions?.forEach((subQ: any) => {
                    const subAnswer = studentAnswerObj[subQ.id] || "";
                    let subScore = 0;

                    if (subQ.validation) {
                        if (subQ.validation.type === 'split_criteria') {
                            // Split Criteria (Keywords / Text) matching legacy "formulas" or "results"
                            // But now likely used for open ended text
                            let points = 0;
                            const keywords = subQ.validation.keywords || subQ.validation.values || [];
                            if (subQ.validation.formulas) keywords.push(...subQ.validation.formulas);
                            if (subQ.validation.results && !subQ.validation.type.includes('numeric')) keywords.push(...subQ.validation.results);

                            let matchCount = 0;
                            keywords.forEach((val: string) => {
                                if (subAnswer.toLowerCase().includes(val.toLowerCase())) {
                                    matchCount++;
                                }
                            });

                            if (subQ.validation.partial && keywords.length > 0) {
                                points = (matchCount / keywords.length) * subQ.points;
                            } else {
                                points = matchCount === keywords.length ? subQ.points : 0;
                            }
                            subScore = points;

                        } else if (subQ.validation.type === 'numeric_set' || subQ.validation.type === 'numeric') {
                            // Numeric Grading with Tolerance
                            const tolerance = subQ.validation.tolerance || 0.02; // Default 2%
                            const parts = subQ.validation.parts || (subQ.validation.value !== undefined ? [{ value: subQ.validation.value }] : []);

                            // Extract all numbers from student answer
                            const sent = subAnswer.replace(/,/g, '.'); // Normalize commas
                            // Match numbers like 123, 123.45, -123.45
                            const numbersFound = sent.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];

                            let partsPassed = 0;

                            parts.forEach((part: any) => {
                                const expected = part.value;
                                // Check if ANY found number matches this expected value within tolerance
                                const foundMatch = numbersFound.some((num: number) => {
                                    const diff = Math.abs(num - expected);
                                    const allowedDiff = Math.abs(expected * tolerance);
                                    // small epsilon for float comparison safety
                                    return diff <= (allowedDiff + 1e-6);
                                });

                                if (foundMatch) {
                                    partsPassed++;
                                }
                            });

                            if (parts.length > 0) {
                                subScore = (partsPassed / parts.length) * subQ.points;
                            }
                        } else {
                            // Fallback (Legacy contains_values)
                            const values = subQ.validation.values || [];
                            let matchCount = 0;
                            values.forEach((val: string) => {
                                if (subAnswer.toLowerCase().includes(val.toLowerCase())) {
                                    matchCount++;
                                }
                            });

                            if (subQ.validation.partial) {
                                subScore = (matchCount / values.length) * subQ.points;
                            } else {
                                subScore = matchCount === values.length ? subQ.points : 0;
                            }
                        }

                        // Cap at max points
                        subScore = Math.min(subScore, subQ.points);
                    }

                    questionScore += subScore;
                });

                manualScores[q.id] = questionScore;
                earnedPoints += questionScore;

            } else {
                // QCM Scoring
                totalPoints += 0.5; // Assuming 0.5 per QCM
                if (finalAnswers[index] === q.correctAnswer) {
                    earnedPoints += 0.5;
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
    const answeredCount = answers.filter(a => a !== null && (typeof a === 'number' || Object.keys(a).length > 0)).length;
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

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-military-green text-white p-4 shadow-md">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
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
            <main className="flex-grow flex p-4 gap-4 max-w-7xl mx-auto w-full">
                {/* Question Grid Sidebar */}
                <div className="hidden lg:block w-64 bg-white rounded-xl shadow-lg p-4 h-fit sticky top-4">
                    <h3 className="font-bold text-gray-700 mb-3 text-center">Navigation</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {flattenedQuestions.map((q, index) => (
                            <button
                                key={index}
                                onClick={() => goToQuestion(index)}
                                className={`w-10 h-10 rounded-lg font-bold text-sm transition-all flex items-center justify-center
                                    ${index === currentQuestionIndex
                                        ? 'bg-military-green text-white ring-2 ring-offset-2 ring-military-green'
                                        : answers[index] !== null
                                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                            : 'bg-gray-100 text-gray-600 border-2 border-gray-300 hover:bg-gray-200'
                                    }`}
                                title={q.type === 'exercise' ? 'Exercice' : `Question ${index + 1}`}
                            >
                                {q.type === 'exercise' ? <FileText size={16} /> : index + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Question Card */}
                <div className="flex-grow bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
                    <div className="p-8 flex-grow overflow-y-auto max-h-[70vh]">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-grow">
                                {currentQuestion.sectionTitle && (
                                    <div className="text-sm font-bold text-military-green uppercase tracking-wider mb-2">
                                        {currentQuestion.sectionTitle}
                                    </div>
                                )}
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {currentQuestion.question}
                                </h2>
                                {currentQuestion.description && (
                                    <p className="text-gray-600 mt-2 italic">{currentQuestion.description}</p>
                                )}
                            </div>
                            <span className="ml-4 px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-600 whitespace-nowrap">
                                {currentQuestion.type === 'exercise' ? 'Exercice' : `Q${currentQuestionIndex + 1}`}
                            </span>
                        </div>

                        {currentQuestion.type === 'exercise' ? (
                            // Exercise View
                            <div className="space-y-6">
                                {currentQuestion.context && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-gray-800 text-sm leading-relaxed">
                                        <h4 className="font-bold mb-2 text-blue-800 flex items-center">
                                            <FileText className="w-4 h-4 mr-2" />
                                            Contexte
                                        </h4>
                                        {currentQuestion.context}
                                    </div>
                                )}

                                {/* Data Visualization */}
                                {currentQuestion.data && (
                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-sm">
                                        <h4 className="font-bold mb-3 text-gray-700 border-b pb-2">Données Techniques</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Object.entries(currentQuestion.data).map(([key, value]) => (
                                                <div key={key} className="bg-white p-3 rounded border border-gray-100 shadow-sm">
                                                    <span className="font-semibold text-gray-600 capitalize block mb-1">
                                                        {key.replace(/_/g, ' ')}
                                                    </span>
                                                    {typeof value === 'object' && value !== null ? (
                                                        <div className="pl-2 border-l-2 border-military-beige space-y-1">
                                                            {Object.entries(value).map(([subKey, subValue]) => (
                                                                <div key={subKey} className="flex justify-between">
                                                                    <span className="text-gray-500">{subKey}:</span>
                                                                    <span className="font-mono font-medium">
                                                                        {typeof subValue === 'object' ? JSON.stringify(subValue) : String(subValue)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="font-mono font-medium text-gray-800">{String(value)}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Image Display */}
                                {(currentQuestion.image || currentQuestion.images) && (
                                    <div className="space-y-6">
                                        {currentQuestion.image && (
                                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center group relative overflow-hidden">
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
                                            <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center group relative overflow-hidden">
                                                <ImageZoom
                                                    src={imgUrl}
                                                    alt={`Figure ${idx + 1}`}
                                                    className="w-full"
                                                />
                                                <div className="mt-4 flex items-center justify-center pointer-events-none">
                                                    <span className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg animate-pulse">
                                                        <LineChart className="w-4 h-4 mr-2" />
                                                        🛠️ Analyser la Figure {idx + 1} (Cliquez sur l'image)
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Image Placeholder (only if no image provided) */}
                                {!currentQuestion.image && !currentQuestion.images && (
                                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                        <p className="text-gray-500 italic">
                                            [Figure / Schéma du dispositif]
                                            <br />
                                            <span className="text-xs">(Image non disponible)</span>
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-6 mt-6">
                                    {currentQuestion.questions?.map((subQ) => (
                                        <div key={subQ.id} className="border-l-4 border-military-beige pl-4 py-2">
                                            <label className="block text-gray-800 font-bold mb-2">
                                                {subQ.question} <span className="text-sm font-normal text-gray-500">({subQ.points} pts)</span>
                                            </label>
                                            <textarea
                                                value={(answers[currentQuestionIndex] as Record<string, string>)?.[subQ.id] || ''}
                                                onChange={(e) => handleExerciseAnswer(subQ.id, e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-military-green focus:border-transparent min-h-[100px]"
                                                placeholder="Votre réponse ici..."
                                            />
                                        </div>
                                    ))}
                                </div>
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

                    {/* Navigation Buttons */}
                    < div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-between items-center" >
                        <button
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0}
                            className={`px-6 py-3 rounded-lg font-bold flex items-center transition-all
                                ${currentQuestionIndex > 0
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <ChevronLeft className="mr-2 w-5 h-5" />
                            Précédent
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={() => finishQuiz(answers)}
                                className="px-8 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center transition-all"
                            >
                                Terminer l'Examen
                                <Save className="ml-2 w-5 h-5" />
                            </button>

                            {currentQuestionIndex < flattenedQuestions.length - 1 && (
                                <button
                                    onClick={handleNext}
                                    className="px-8 py-3 rounded-lg font-bold text-white bg-military-green hover:bg-green-800 shadow-lg flex items-center transition-all"
                                >
                                    Suivant
                                    <ChevronRight className="ml-2 w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div >
                </div >
            </main >

            {/* PDF Viewer Modal */}
            <ExamPDFViewer
                pdfUrl="/resources/exam_explosions_gc31.pdf"
                isOpen={isPdfViewerOpen}
                onClose={() => setIsPdfViewerOpen(false)}
                studentName={studentData?.nom}
            />

        </div>
    );
};

export default Quiz;
