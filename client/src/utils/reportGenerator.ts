import jsPDF from 'jspdf';

export interface QuizResult {
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
    answers: any[];
    manualScores?: Record<string, number>;
    isPractice?: boolean;
}

export interface Question {
    id: number | string;
    type?: string;
    question?: string;
    title?: string;
    options?: string[];
    correctAnswer?: number;
    questions?: any[];
    detailed_solution?: string;
    solution?: string;
}

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
        .replace(/m\/kg¹\/³/g, 'm/kg^(1/3)')
        .replace(/¹\/³/g, '^(1/3)')
        .replace(/q₀/g, 'q0');
};

const drawRichText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number) => {
    if (!text) return y;
    const words = String(text).split(' ');
    let currentY = y;
    const lineHeight = fontSize * 0.7;

    const lines: string[] = [];
    let currentLineWords: string[] = [];
    let currentLineWidth = 0;

    words.forEach(word => {
        const cleanWord = word.replace(/\^|\_/g, '').replace(/[(){}]/g, '');
        const wordWidth = doc.getStringUnitWidth(cleanWord) * fontSize / doc.internal.scaleFactor;

        if (currentLineWidth + wordWidth + 2 > maxWidth) {
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
            const offsetY = isSuper ? -2 : (isSub ? 2 : 0);

            doc.text(segment, cursorX, currentY + offsetY);

            const segWidth = doc.getStringUnitWidth(segment) * doc.getFontSize() / doc.internal.scaleFactor;
            cursorX += segWidth;
            doc.setFontSize(fontSize);
        });

        currentY += lineHeight + 2;
    });

    return currentY;
};

export const generateIndividualReport = async (result: QuizResult, quizQuestions: Question[], externalManualScores: Record<string, number> = {}) => {
    const doc = new jsPDF();

    // Merge manual scores: external takes precedence for "unsaved" changes, but result.manualScores is used for batch
    const manualScores = { ...(result.manualScores || {}), ...externalManualScores };

    // Load assets
    let signatureDataUrl = '';
    let scoreCircleDataUrl = '';
    let stampDataUrl = '';
    try {
        signatureDataUrl = await loadImage('/signature.png');
        scoreCircleDataUrl = await loadImage('/score_circle.png');
        stampDataUrl = await loadImage('/golden_stamp_pdf.png');
    } catch (err) {
        console.error('Failed to load report assets:', err);
    }

    // Header
    doc.setFontSize(22);
    doc.setTextColor(45, 80, 22);
    doc.text("RAPPORT INDIVIDUEL", 105, 20, { align: "center" });

    // Score
    if (scoreCircleDataUrl) {
        doc.addImage(scoreCircleDataUrl, 'PNG', 160, 15, 40, 40);
    }
    doc.setFontSize(22);
    doc.setFont("times", "italic");
    doc.setTextColor(200, 0, 0);
    doc.text(`${result.scoreOn20.toFixed(1)}/20`, 180, 42, { align: "center", angle: 15 });

    // Signature
    if (signatureDataUrl) {
        doc.addImage(signatureDataUrl, 'PNG', 20, 25, 60, 30);
    }
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Lt Col Oussama Atoui", 50, 58, { align: "center" });
    doc.text("Instructeur Armes et Munitions", 50, 62, { align: "center" });

    // Stamp
    if (stampDataUrl) {
        doc.addImage(stampDataUrl, 'PNG', 155, 60, 50, 50);
    }

    // Student Info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 0, 0);
    doc.text(`Nom: ${result.student.grade} ${result.student.name}`, 20, 70);

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.text(`Classe: ${result.student.className}`, 20, 78);
    doc.text(`Matricule: ${result.student.matricule}`, 20, 86);

    doc.text(`Discipline: ${result.discipline.toUpperCase()}`, 140, 70);
    doc.text(`Score: ${result.scoreOn20.toFixed(2)}/20`, 140, 78);
    const mins = Math.floor(result.timeElapsed / 60);
    const secs = Math.round(result.timeElapsed % 60);
    doc.text(`Temps: ${mins}:${secs.toString().padStart(2, '0')}`, 140, 84);
    doc.text(`Date: ${new Date(result.timestamp).toLocaleDateString()}`, 140, 90);

    let yPos = 110;
    doc.setFontSize(16);
    doc.text("Détail des réponses et notation", 20, yPos);
    yPos += 12;

    if (result.discipline === 'explosions') {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        const noteText = "NOTE: Une correction interactive détaillée pour les Séquences 1, 2 et 3 est disponible sur la plateforme (OAMA Plateform).";
        yPos = drawRichText(doc, noteText, 20, yPos, 145, 10);
        yPos += 4;
    }

    doc.setFontSize(10);

    quizQuestions.forEach((q, index) => {
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }

        const answerObj = Array.isArray(result.answers)
            ? result.answers.find((a: any) => a && (a.questionId === q.id || a.id === q.id))
            : null;

        const isExercise = q.type === 'exercise';
        const questionText = sanitizeSymbols(`${isExercise ? ('Exercice: ' + (q.title || 'Partie ' + (index + 1))) : ('Q' + (index + 1) + ': ' + (q.question || q.title || 'Question'))}`);

        doc.setTextColor(isExercise ? 0 : 0, isExercise ? 51 : 0, isExercise ? 102 : 0);
        doc.setFont("helvetica", "bold");
        yPos = drawRichText(doc, questionText, 20, yPos, 160, 10);
        yPos += 2;

        if (isExercise) {
            const exerciseSubQuestions = q.questions || [];
            const subScoreSum = exerciseSubQuestions.reduce((sum: number, sq: any) => sum + (manualScores[`${q.id}_${sq.id}`] || 0), 0);
            const maxPoints = exerciseSubQuestions.reduce((sum: number, sq: any) => sum + sq.points, 0) || 0;
            doc.setTextColor(100, 100, 100);
            doc.text(`${subScoreSum.toFixed(2)} / ${maxPoints} pts`, 160, yPos);
        }

        yPos += 4;

        if (isExercise) {
            const studentAnswers = answerObj ? answerObj.answer : (result.answers[index] || {});
            (q.questions || []).forEach((subQ: any) => {
                if (yPos > 260) { doc.addPage(); yPos = 20; }

                doc.setFont("helvetica", "normal");
                doc.setTextColor(0);
                const qSubScore = manualScores[`${q.id}_${subQ.id}`] || 0;
                const qSubText = sanitizeSymbols(`- ${subQ.label || subQ.question} (${qSubScore}/${subQ.points})`);
                yPos = drawRichText(doc, qSubText, 25, yPos, 145, 10);

                const answerText = sanitizeSymbols(studentAnswers[subQ.id] || "(Aucune réponse)");

                const estLines = Math.ceil(doc.getStringUnitWidth(answerText) * 10 / doc.internal.scaleFactor / 145) || 1;
                const boxHeight = (estLines * 7) + 6;

                doc.setDrawColor(200);
                doc.setFillColor(245, 247, 250);
                doc.rect(28, yPos + 2, 145, boxHeight, 'FD');

                doc.setFont("helvetica", "normal");
                doc.setTextColor(60, 60, 60);
                const finalY = drawRichText(doc, answerText, 32, yPos + 7, 135, 10);
                yPos = finalY + 8;
            });

            if (q.detailed_solution || q.solution) {
                if (result.discipline === 'explosions') {
                    if (yPos > 250) { doc.addPage(); yPos = 20; }
                    doc.setFillColor(240, 253, 244);
                    doc.setDrawColor(22, 163, 74);
                    doc.rect(30, yPos, 140, 25, 'FD');

                    doc.setTextColor(21, 128, 61);
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
                    const solutionText = sanitizeSymbols(`Correction Context: ${q.detailed_solution || q.solution}`);
                    yPos = drawRichText(doc, solutionText, 30, yPos, 145, 9);
                    yPos += 4;
                    doc.setFontSize(10);
                }
            }
        } else {
            const userAnswer = answerObj ? answerObj.answer : result.answers[index];
            const isCorrect = userAnswer === q.correctAnswer;

            const optionText = sanitizeSymbols(q.options?.[userAnswer] || 'N/A');
            const feedbackText = isCorrect ? '(Correct 0.5/0.5)' : '(Incorrect 0/0.5)';
            const fullAnswerText = `Réponse: ${optionText} ${feedbackText}`;

            const estLines = Math.ceil(doc.getStringUnitWidth(fullAnswerText) * 10 / doc.internal.scaleFactor / 145) || 1;
            const boxHeight = (estLines * 7) + 6;

            doc.setDrawColor(isCorrect ? 150 : 200, isCorrect ? 200 : 150, isCorrect ? 150 : 150);
            doc.setFillColor(isCorrect ? 240 : 255, isCorrect ? 250 : 240, isCorrect ? 240 : 240);
            doc.rect(25, yPos, 145, boxHeight, 'FD');

            doc.setFont("helvetica", "normal");
            doc.setTextColor(isCorrect ? 0 : 200, isCorrect ? 100 : 0, 0);
            const finalY = drawRichText(doc, fullAnswerText, 30, yPos + 5, 135, 10);
            yPos = finalY + 4;

            if (!isCorrect) {
                if (result.discipline === 'explosions') {
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
                    const correctText = sanitizeSymbols(`Bonne réponse: ${q.options?.[q.correctAnswer ?? 0] || 'N/A'}`);
                    yPos = drawRichText(doc, correctText, 30, yPos, 145, 10);
                    yPos += 2;
                }
            }
        }
        yPos += 6;
    });

    return doc;
};
