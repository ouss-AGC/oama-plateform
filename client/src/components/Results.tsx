import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Home, Award, Trophy, AlertTriangle, BarChart as BarChartIcon, FileText, BookOpen, CheckCircle, XCircle, TrendingUp, Lock } from 'lucide-react';
import { generateCertificate, generateVisualCertificate } from '../utils/certificateGenerator';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import ImageZoom from './ImageZoom';

interface Question {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    detailed_solution?: string;
    solution?: string;
    image_url?: string;
    type?: string;
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
    answers: any[];
    isPractice?: boolean; // Flag for practice quiz
}

const Results: React.FC = () => {
    const navigate = useNavigate();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [visualCertificate, setVisualCertificate] = useState<string>('');
    const [classStats, setClassStats] = useState({ average: 0, max: 0, min: 0 });
    const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
    const [showPinPrompt, setShowPinPrompt] = useState(false);
    const [enteredPin, setEnteredPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pendingAction, setPendingAction] = useState<() => void>(() => { });
    const [activeCorrection, setActiveCorrection] = useState<{ url: string; title: string } | null>(null);

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
                // Load practice questions if this is a practice quiz
                const fileName = parsedResult.isPractice
                    ? `${parsedResult.discipline}_practice.json`
                    : `quiz_data_${parsedResult.discipline === 'explosions' ? 'explosions_v2' : parsedResult.discipline}.json`;
                const questionsRes = await fetch(`/${fileName}`);
                const questionsData = await questionsRes.json();

                if (questionsData.sections) {
                    let flat: any[] = [];
                    questionsData.sections.forEach((section: any) => {
                        if (section.type === 'exercise') {
                            // Split sub-questions into individual items (Source: Quiz.tsx line 271)
                            const subQs = section.questions || [];
                            subQs.forEach((subQ: any) => {
                                flat.push({
                                    ...subQ,
                                    id: `${section.id}_${subQ.id}`,
                                    parentId: section.id,
                                    type: 'exercise',
                                    question: subQ.question || section.title,
                                    options: ["(Exercice de calcul)"],
                                    correctAnswer: -1,
                                    subQuestions: (subQ.subQuestions || []).map((atomic: any) => ({
                                        ...atomic,
                                        label: atomic.label || atomic.question
                                    })),
                                    detailed_solution: subQ.detailed_solution || subQ.solution || section.detailed_solution || section.solution
                                });
                            });
                        } else {
                            // QCM section
                            if (section.questions) {
                                section.questions.forEach((q: any) => {
                                    flat.push({
                                        ...q,
                                        type: 'qcm',
                                        parentId: section.id
                                    });
                                });
                            }
                        }
                    });
                    setQuizQuestions(flat);
                } else {
                    setQuizQuestions(questionsData.questions);
                }
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

    const handleVerifyAndDownload = (action: () => void) => {
        setPendingAction(() => action);
        setShowPinPrompt(true);
        setPinError('');
        setEnteredPin('');
    };

    const confirmPin = async () => {
        try {
            const response = await fetch('/api/verify-report-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: enteredPin }),
            });

            const data = await response.json();
            if (data.valid) {
                setShowPinPrompt(false);
                pendingAction();
            } else {
                setPinError("Code PIN incorrect. Veuillez demander à l'instructeur.");
            }
        } catch (err) {
            setPinError("Erreur de connexion.");
        }
    };

    const generateReport = () => {
        if (!result || result.scoreOn20 === undefined || result.scoreOn20 === null) {
            console.error('Cannot generate report: invalid result data');
            return;
        }
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
        // Helper for Rich Text (Superscript/Subscript)
        const drawRichText = (text: string, x: number, y: number, maxWidth: number, fontSize: number) => {
            const words = text.split(' ');
            let line = '';
            let currentY = y;
            const lineHeight = fontSize * 0.5; // Pdf units approx

            // Simple word wrap based on rough char count or measureText if possible
            // jsPDF measureText is accurate.
            const lines: string[] = [];
            let currentLineWords: string[] = [];
            let currentLineWidth = 0;

            words.forEach(word => {
                // Approximate width calculation including checks for ^ and _ (which reduce width slightly but we ignore for safety)
                const cleanWord = word.replace(/\^|\_/g, '').replace(/[(){}]/g, '');
                const wordWidth = doc.getStringUnitWidth(cleanWord) * fontSize / doc.internal.scaleFactor;

                if (currentLineWidth + wordWidth + 2 > maxWidth) { // +2 for space
                    lines.push(currentLineWords.join(' '));
                    currentLineWords = [word];
                    currentLineWidth = wordWidth;
                } else {
                    currentLineWords.push(word);
                    currentLineWidth += wordWidth + 2;
                }
            });
            if (currentLineWords.length > 0) lines.push(currentLineWords.join(' '));

            lines.forEach(lineStr => {
                if (currentY > 270) {
                    doc.addPage();
                    currentY = 20;
                }

                let cursorX = x;
                // Parse and draw per line
                // Simple parser: split by tokens including ^(content) or _(content)
                // Regex: Match generic text, or ^(...), or _(...)
                // We will manually split by chars for simplest "rendering" ensuring baseline alignment
                // Actually, word by word is safer for spacing.

                const tokens = lineStr.split(/(\^[(][^)]+[)]|\^.|\_[(][^)]+[)]|\_.)/g).filter(t => t);

                tokens.forEach(token => {
                    let segment = token;
                    let isSuper = false;
                    let isSub = false;

                    if (token.startsWith('^')) {
                        isSuper = true;
                        segment = token.startsWith('^(') ? token.slice(2, -1) : token.slice(1);
                    } else if (token.startsWith('_')) {
                        isSub = true;
                        segment = token.startsWith('_(') ? token.slice(2, -1) : token.slice(1);
                    }

                    doc.setFontSize(isSuper || isSub ? fontSize * 0.7 : fontSize);
                    const offsetY = isSuper ? -1.5 : (isSub ? 1.5 : 0);

                    doc.text(segment, cursorX, currentY + offsetY);

                    const segWidth = doc.getStringUnitWidth(segment) * doc.getFontSize() / doc.internal.scaleFactor;
                    cursorX += segWidth;
                    doc.setFontSize(fontSize); // Restore
                });

                currentY += lineHeight + 3;
            });

            return currentY; // Return new Y position
        };

        // Load all assets first
        Promise.all([
            loadImage('/signature.png').catch(err => { console.error('Failed to load signature:', err); return ''; }),
            loadImage('/score_circle.png').catch(err => { console.error('Failed to load score circle:', err); return ''; }),
            loadImage('/golden_stamp_pdf.png').catch(err => { console.error('Failed to load stamp:', err); return ''; })
        ]).then(([signatureDataUrl, scoreCircleDataUrl, stampDataUrl]) => {

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
            // Explicitly assert result! here as checked above
            doc.text(`${result!.scoreOn20.toFixed(1)}/20`, 180, 42, { align: "center", angle: 15 });

            // Add signature on the left (Reduced size)
            if (signatureDataUrl) {
                doc.addImage(signatureDataUrl, 'PNG', 20, 25, 60, 30); // Smaller signature
            }

            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text("Lt Col Oussama Atoui", 50, 58, { align: "center" }); // Closer to signature
            doc.text("Instructeur Armes et Munitions", 50, 62, { align: "center" }); // Closer to signature

            // Add Golden Stamp (Right side, below score circle)
            if (stampDataUrl) {
                doc.addImage(stampDataUrl, 'PNG', 155, 60, 50, 50); // Right side, larger, below score
            }

            // Student information
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(200, 0, 0); // Red Name
            doc.text(`Nom: ${result!.student.grade} ${result!.student.name}`, 20, 70);

            doc.setTextColor(0); // Reset to black
            doc.setFont("helvetica", "normal");
            doc.text(`Classe: ${result!.student.className}`, 20, 78);
            doc.text(`Matricule: ${result!.student.matricule}`, 20, 86);

            doc.text(`Discipline: ${result!.discipline.toUpperCase()}`, 140, 70);
            doc.text(`Score: ${result!.scoreOn20.toFixed(2)}/20`, 140, 78);
            doc.text(`Date: ${new Date(result!.timestamp).toLocaleDateString()}`, 140, 86);

            let yPos = 100;
            doc.setFontSize(16);
            doc.text("Détail des réponses", 20, yPos);
            yPos += 12;


            const sanitizeSymbols = (text: string) => {
                return text
                    .replace(/ωₙ/g, 'omega_n')
                    .replace(/xₑₗ/g, 'x_(el)')
                    .replace(/xₘₐₓ/g, 'x_(max)')
                    .replace(/xₘ/g, 'x_(max)')
                    .replace(/Pₛ₀/g, 'P_(s0)')
                    .replace(/p₀/g, 'p0')
                    .replace(/tₐ/g, 'ta')
                    .replace(/t₀/g, 't0')
                    .replace(/iₛ/g, 'is')
                    .replace(/μ/g, 'mu')
                    .replace(/Zₐ/g, 'Za')
                    .replace(/Zᵦ/g, 'Zb')
                    .replace(/Z\*/g, 'Z*')
                    .replace(/Pᵣ/g, 'Pr')
                    .replace(/Cᵣ/g, 'C_r')
                    .replace(/ρ/g, 'rho')
                    .replace(/ξ/g, 'xi')
                    .replace(/³/g, '^3')
                    .replace(/m\/kg¹\/³/g, 'm/kg^(1/3)') // Explicit unit fix
                    .replace(/¹\/³/g, '^(1/3)')
                    .replace(/q₀/g, 'q0');
            };

            // Mention Interactive Correction for Sequence 3
            if (result!.discipline === 'explosions') {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(79, 70, 229); // Indigo
                const noteText = "NOTE: Une correction interactive détaillée pour les Séquences 1, 2 et 3 est disponible sur la plateforme (OAMA Plateform).";
                yPos = drawRichText(noteText, 20, yPos, 145, 10);
                yPos += 4;
            }

            doc.setFontSize(10);
            // line height managed by drawRichText

            quizQuestions.forEach((q: any, index: number) => {
                if (yPos > 260) {
                    doc.addPage();
                    yPos = 20;
                }

                const isExercise = q.type === 'exercise';
                const questionText = sanitizeSymbols(`Q${index + 1}: ${q.question}`);

                doc.setTextColor(0);
                doc.setFont("helvetica", "bold");
                // Use RichText for Questions too
                yPos = drawRichText(questionText, 20, yPos, 160, 10);
                yPos += 2;

                if (isExercise) {
                    const studentAnswers = result!.answers[index] || {};
                    (q.subQuestions || []).forEach((subQ: any) => {
                        if (yPos > 260) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(80);
                        const subQLabel = sanitizeSymbols(`• ${subQ.label}: `);
                        yPos = drawRichText(subQLabel, 25, yPos, 145, 10);

                        const answer = sanitizeSymbols(studentAnswers[subQ.id] || "Aucune réponse");

                        // Measure height approx:
                        const estLines = Math.ceil(doc.getStringUnitWidth(answer) * 10 / doc.internal.scaleFactor / 145) || 1;
                        const boxHeight = (estLines * 7) + 6;

                        doc.setDrawColor(200);
                        doc.setFillColor(245, 247, 250);
                        doc.rect(28, yPos + 2, 145, boxHeight, 'FD'); // Width reduced to 145

                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(40);

                        // Draw text INSIDE box
                        const finalY = drawRichText(answer, 32, yPos + 7, 135, 10); // Width 135 inside box
                        yPos = finalY + 8;
                    });

                    if (q.detailed_solution) {
                        if (result!.discipline === 'explosions') {
                            // VISUAL BANNER instead of text
                            if (yPos > 250) { doc.addPage(); yPos = 20; }
                            doc.setFillColor(240, 253, 244); // Light Green bg
                            doc.setDrawColor(22, 163, 74); // Green border
                            doc.rect(30, yPos, 140, 25, 'FD');

                            doc.setTextColor(21, 128, 61); // Green text
                            doc.setFont("helvetica", "bold");
                            doc.text("CORRECTION INTERACTIVE DISPONIBLE", 100, yPos + 10, { align: "center" });
                            doc.setFont("helvetica", "normal");
                            doc.setFontSize(9);
                            doc.text("(Voir plateforme OAMA: Séquences 1, 2 & 3)", 100, yPos + 18, { align: "center" });
                            doc.setFontSize(10);

                            yPos += 35;
                        } else {
                            doc.setTextColor(0, 100, 0);
                            doc.setFont("helvetica", "italic");
                            doc.setFontSize(9);
                            const solutionText = sanitizeSymbols(`Correction Suggestion: ${q.detailed_solution}`);
                            yPos = drawRichText(solutionText, 30, yPos, 145, 9);
                            yPos += 4;
                            doc.setFontSize(10);
                        }
                    }
                } else {
                    const userAnswer = result!.answers[index];
                    const isCorrect = userAnswer === q.correctAnswer;

                    // Box for QCM answer
                    const optionText = sanitizeSymbols(q.options?.[userAnswer] || 'N/A');
                    const feedbackText = isCorrect ? '(Correct)' : '(Incorrect)';
                    const fullAnswerText = `Votre réponse: ${optionText} ${feedbackText}`;

                    const estLines = Math.ceil(doc.getStringUnitWidth(fullAnswerText) * 10 / doc.internal.scaleFactor / 145) || 1;
                    const boxHeight = (estLines * 7) + 6;

                    doc.setDrawColor(isCorrect ? 150 : 200, isCorrect ? 200 : 150, isCorrect ? 150 : 150);
                    doc.setFillColor(isCorrect ? 240 : 255, isCorrect ? 250 : 240, isCorrect ? 240 : 240);
                    doc.rect(25, yPos, 145, boxHeight, 'FD'); // Width 145

                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(isCorrect ? 0 : 200, isCorrect ? 100 : 0, 0);
                    const finalY = drawRichText(fullAnswerText, 30, yPos + 5, 135, 10); // Inside box
                    yPos = finalY + 4;

                    if (!isCorrect) {
                        if (result!.discipline === 'explosions') {
                            // VISUAL BANNER smaller
                            if (yPos > 260) { doc.addPage(); yPos = 20; }
                            doc.setFillColor(240, 253, 244);
                            doc.setDrawColor(22, 163, 74);
                            doc.rect(30, yPos, 140, 15, 'FD');
                            doc.setTextColor(21, 128, 61);
                            doc.setFont("helvetica", "bold");
                            doc.setFontSize(9);
                            doc.text("Voir Correction Interactive (Plateforme)", 100, yPos + 10, { align: "center" });
                            doc.setFontSize(10);
                            yPos += 20;
                        } else {
                            doc.setTextColor(0, 100, 0);
                            doc.setFont("helvetica", "bold");
                            const correctText = sanitizeSymbols(`Bonne réponse: ${q.options?.[q.correctAnswer] || 'N/A'}`);
                            yPos = drawRichText(correctText, 30, yPos, 145, 10);
                            yPos += 2;
                        }
                    }
                }
                yPos += 6;
            });


            doc.save(`Rapport_${result!.student.name}.pdf`);
        });
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

            {/* PIN Prompt Modal */}
            {showPinPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-gray-200 animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center mb-6">
                            <div className="bg-orange-100 p-3 rounded-full mb-4">
                                <Lock className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Sécurité du Rapport</h3>
                            <p className="text-gray-500 text-sm text-center mt-2">Veuillez entrer le PIN fourni par l'instructeur pour télécharger votre document.</p>
                        </div>

                        <input
                            type="text"
                            value={enteredPin}
                            onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onKeyPress={(e) => e.key === 'Enter' && confirmPin()}
                            placeholder="PIN"
                            autoFocus
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-orange-500 transition-colors mb-4"
                        />

                        {pinError && (
                            <p className="text-red-500 text-sm text-center mb-4 font-medium">{pinError}</p>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowPinPrompt(false)}
                                className="py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmPin}
                                disabled={!enteredPin}
                                className={`py-3 rounded-xl font-bold text-white shadow-lg transition-all ${enteredPin ? 'bg-orange-600 hover:bg-orange-700 active:scale-95' : 'bg-gray-300 cursor-not-allowed'}`}
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden transform transition-all hover:scale-[1.01]">
                {/* Practice Badge */}
                {result?.isPractice && (
                    <div className="bg-blue-600 text-white text-center py-2 px-4 font-bold text-sm">
                        🎯 TEST D'ÉVALUATION - PRATIQUE
                    </div>
                )}

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
                    {result?.isPractice && (
                        <p className="text-sm mt-2 opacity-80">
                            Ceci est un test de pratique. Passez le quiz officiel pour validation.
                        </p>
                    )}
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
                            onClick={() => handleVerifyAndDownload(generateReport)}
                            className="px-6 py-3 rounded-lg bg-gray-800 text-white font-bold hover:bg-gray-900 flex items-center justify-center shadow-md transition-colors"
                        >
                            <FileText className="w-5 h-5 mr-2" />
                            Télécharger Rapport PDF
                        </button>

                        {result.discipline === 'explosions' && (
                            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                <button
                                    onClick={() => setActiveCorrection({
                                        url: '/resources/Sequence_1_MCQ_Correction_Interactive.html',
                                        title: 'Séquence 1 : QCM Détonique'
                                    })}
                                    className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 flex items-center justify-center shadow-md transition-colors"
                                >
                                    <BookOpen className="w-5 h-5 mr-2" />
                                    Correction Séquence 1
                                </button>

                                <button
                                    onClick={() => setActiveCorrection({
                                        url: '/resources/Sequence_2_Partie02_Correction_Interactive.html',
                                        title: 'Séquence 2 : Partie 02 - Problème Pratique'
                                    })}
                                    className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 flex items-center justify-center shadow-md transition-colors"
                                >
                                    <BookOpen className="w-5 h-5 mr-2" />
                                    Correction Séquence 2
                                </button>

                                <button
                                    onClick={() => setActiveCorrection({
                                        url: '/resources/SDOF_Correction_Interactive.html',
                                        title: 'Séquence 3 : Analyse SDOF'
                                    })}
                                    className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 flex items-center justify-center shadow-md transition-colors"
                                >
                                    <BookOpen className="w-5 h-5 mr-2" />
                                    Correction Séquence 3
                                </button>
                            </div>
                        )}
                        {/* Download Certificate button only for scores > 15 */}
                        {isPass && canDownloadCertificate && (
                            <button
                                onClick={() => handleVerifyAndDownload(async () => {
                                    try {
                                        await generateCertificate(result);
                                    } catch (error) {
                                        console.error("Certificate generation failed:", error);
                                        alert("Erreur lors de la génération du certificat. Veuillez réessayer.");
                                    }
                                })}
                                className="px-6 py-3 rounded-lg bg-military-beige text-military-green font-bold hover:bg-yellow-200 flex items-center justify-center shadow-md transition-colors"
                            >
                                <Download className="w-5 h-5 mr-2" />
                                Télécharger Certificat
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Correction Modal */}
            {activeCorrection && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-tighter text-lg leading-none">Correction Interactive</h3>
                                    <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-1">{activeCorrection.title}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveCorrection(null)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                            >
                                <XCircle className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="flex-grow bg-slate-100 p-1 relative">
                            {/* Security Overlay for Right Click (Fallback) */}
                            <div
                                className="absolute inset-0 pointer-events-none z-10"
                                onContextMenu={(e) => e.preventDefault()}
                            ></div>
                            <iframe
                                src={activeCorrection.url}
                                className="w-full h-full border-none rounded-xl bg-white shadow-inner"
                                title="Correction Interactif"
                            ></iframe>
                        </div>

                        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                            <p className="font-bold flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1 text-indigo-600" />
                                Document Confidentiel - OAMA Plateform
                            </p>
                            <p className="italic underline uppercase tracking-tighter">Accès Participant</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Results;
