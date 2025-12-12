import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ChevronRight, ChevronLeft, Save, AlertCircle } from 'lucide-react';

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

const Quiz: React.FC = () => {
    const navigate = useNavigate();
    const [quizData, setQuizData] = useState<QuizData | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>([]); // null = not answered
    const [timeLeft, setTimeLeft] = useState(3600); // Default 1 hour = 3600 seconds
    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState<any>(null); // Store student info at quiz start
    const [timeLimit, setTimeLimit] = useState(3600); // Dynamic time limit based on discipline
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        // Get mode and discipline from URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const urlDiscipline = urlParams.get('discipline');
        const isPractice = mode === 'practice';

        // Get discipline from localStorage or URL
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

        // CRITICAL: Store student data in component state at quiz start
        // This prevents the bug where all results show the last registered student
        setStudentData(JSON.parse(studentInfo));

        const fetchQuizData = async () => {
            try {
                // Load practice questions if mode=practice, otherwise load official questions
                const fileName = isPractice ? `${discipline}_practice.json` : `quiz_data_${discipline}.json`;
                const response = await fetch(`/${fileName}`);
                if (!response.ok) throw new Error('Failed to load quiz data');
                const data = await response.json();
                setQuizData(data);
                // Initialize answers array with nulls
                setAnswers(new Array(data.questions.length).fill(null));
                setLoading(false);

                // Start countdown timer
                timerRef.current = window.setInterval(() => {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            // Time's up! Auto-submit
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

    // Auto-submit when time runs out
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

    const goToQuestion = (index: number) => {
        setCurrentQuestionIndex(index);
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < (quizData?.questions.length || 0) - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const finishQuiz = async (finalAnswers: (number | null)[]) => {
        if (timerRef.current) clearInterval(timerRef.current);

        // Calculate score (unanswered questions count as wrong)
        let correctCount = 0;
        quizData?.questions.forEach((q, index) => {
            if (finalAnswers[index] === q.correctAnswer) {
                correctCount++;
            }
        });

        const totalQuestions = quizData?.questions.length || 0;
        const scorePercentage = (correctCount / totalQuestions) * 100;
        const scoreOn20 = (correctCount / totalQuestions) * 20;
        const timeElapsed = timeLimit - timeLeft;

        // Get mode from URL to determine if this is practice
        const urlParams = new URLSearchParams(window.location.search);
        const isPractice = urlParams.get('mode') === 'practice';

        // IMPORTANT: Use student data that was stored when THIS student started the quiz
        // Not from localStorage which might have been overwritten by another student
        const resultData = {
            discipline: localStorage.getItem('selectedDiscipline'),
            student: studentData || JSON.parse(localStorage.getItem('studentInfo') || '{}'),
            answers: finalAnswers,
            score: scorePercentage,
            scoreOn20: scoreOn20,
            totalQuestions,
            correctCount,
            timeElapsed: timeElapsed,
            timestamp: Date.now(),
            isPractice: isPractice // Add practice flag
        };

        localStorage.setItem('lastQuizResult', JSON.stringify(resultData));

        // Save to history
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        history.push(resultData);
        localStorage.setItem('quizHistory', JSON.stringify(history));

        // Submit to server
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

    const currentQuestion = quizData.questions[currentQuestionIndex];
    const answeredCount = answers.filter(a => a !== null).length;
    const progressPercentage = (answeredCount / quizData.questions.length) * 100;
    const selectedOption = answers[currentQuestionIndex];
    const discipline = localStorage.getItem('selectedDiscipline');
    // For explosions: red at 20 minutes (1200s), for others: red at 5 minutes (300s)
    const warningThreshold = discipline === 'explosions' ? 1200 : 300;
    const isTimeRunningOut = timeLeft < warningThreshold;

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
                        <div className={`flex items-center px-6 py-3 rounded-full shadow-lg ${isTimeRunningOut ? 'bg-red-600 animate-pulse' : 'bg-green-800'}`}>
                            <Clock className="w-6 h-6 mr-3" />
                            <span className="font-mono font-bold text-2xl">{formatTime(timeLeft)}</span>
                        </div>
                        <div className="text-sm font-medium">
                            {answeredCount} / {quizData.questions.length} répondues
                        </div>
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="w-full bg-gray-300 h-2">
                <div
                    className="bg-military-beige h-2 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>

            {/* Time Warning */}
            {isTimeRunningOut && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-center">
                    <div className="flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        <span className="font-semibold">
                            Attention ! Il vous reste moins de {discipline === 'explosions' ? '20' : '5'} minutes !
                        </span>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-grow flex p-4 gap-4 max-w-7xl mx-auto w-full">
                {/* Question Grid Sidebar */}
                <div className="hidden lg:block w-64 bg-white rounded-xl shadow-lg p-4 h-fit sticky top-4">
                    <h3 className="font-bold text-gray-700 mb-3 text-center">Navigation</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {quizData.questions.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToQuestion(index)}
                                className={`w-10 h-10 rounded-lg font-bold text-sm transition-all
                                    ${index === currentQuestionIndex
                                        ? 'bg-military-green text-white ring-2 ring-offset-2 ring-military-green'
                                        : answers[index] !== null
                                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                            : 'bg-gray-100 text-gray-600 border-2 border-gray-300 hover:bg-gray-200'
                                    }`}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 text-xs text-gray-600 space-y-1">
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded mr-2"></div>
                            <span>Répondue</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded mr-2"></div>
                            <span>Non répondue</span>
                        </div>
                    </div>
                </div>

                {/* Question Card */}
                <div className="flex-grow bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
                    <div className="p-8 flex-grow">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold text-gray-800 flex-grow">
                                {currentQuestion.question}
                            </h2>
                            <span className="ml-4 px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-600">
                                Q{currentQuestionIndex + 1}/{quizData.questions.length}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {currentQuestion.options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleOptionSelect(index)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between group
                                        ${selectedOption === index
                                            ? 'border-military-green bg-green-50 text-military-green shadow-md'
                                            : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="font-medium text-lg">{option}</span>
                                    {selectedOption === index && (
                                        <CheckCircle className="w-6 h-6 text-military-green" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-between items-center">
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
                            {currentQuestionIndex === quizData.questions.length - 1 ? (
                                <button
                                    onClick={() => finishQuiz(answers)}
                                    className="px-8 py-3 rounded-lg font-bold text-white bg-military-green hover:bg-green-800 shadow-lg flex items-center transition-all"
                                >
                                    Terminer le Quiz
                                    <Save className="ml-2 w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="px-8 py-3 rounded-lg font-bold text-white bg-military-green hover:bg-green-800 shadow-lg flex items-center transition-all"
                                >
                                    Suivant
                                    <ChevronRight className="ml-2 w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Quiz;
