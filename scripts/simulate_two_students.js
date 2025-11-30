// Native fetch is available in Node 18+

const STUDENTS = [
    { name: "Karim Mansouri", grade: "EOA", matricule: "LASM3-001", className: "LASM 3" },
    { name: "Ahmed Trabelsi", grade: "OEA", matricule: "LASM3-002", className: "LASM 3" }
];

const DISCIPLINE = "munitions"; // Munitions discipline
const TOTAL_QUESTIONS = 57; // Munitions has 57 questions

const fs = require('fs');
const path = require('path');

async function runSimulation() {
    console.log("Starting 2-student simulation for LASM 3...");

    // Read quiz data to know correct answers
    const quizPath = path.join(__dirname, '../client/public/quiz_data_munitions.json');
    const quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
    const questions = quizData.questions;

    // Student 1: High score (EOA - 17.5/20)
    const student1TargetScore = 17.5;
    const answers1 = [];
    let correctCount1 = 0;

    questions.forEach(q => {
        const isCorrect = Math.random() < (student1TargetScore / 20);
        if (isCorrect) {
            answers1.push(q.correctAnswer);
            correctCount1++;
        } else {
            let wrong = (q.correctAnswer + 1) % 4;
            answers1.push(wrong);
        }
    });

    const scorePercentage1 = (correctCount1 / questions.length) * 100;
    const scoreOn20_1 = (correctCount1 / questions.length) * 20;
    const timeElapsed1 = 2100; // 35 minutes

    const resultData1 = {
        discipline: DISCIPLINE,
        student: STUDENTS[0],
        answers: answers1,
        score: scorePercentage1,
        scoreOn20: scoreOn20_1,
        totalQuestions: questions.length,
        correctCount: correctCount1,
        timeElapsed: timeElapsed1,
        timestamp: Date.now()
    };

    // Student 2: Low score (OEA - 8.5/20)
    const student2TargetScore = 8.5;
    const answers2 = [];
    let correctCount2 = 0;

    questions.forEach(q => {
        const isCorrect = Math.random() < (student2TargetScore / 20);
        if (isCorrect) {
            answers2.push(q.correctAnswer);
            correctCount2++;
        } else {
            let wrong = (q.correctAnswer + 2) % 4;
            answers2.push(wrong);
        }
    });

    const scorePercentage2 = (correctCount2 / questions.length) * 100;
    const scoreOn20_2 = (correctCount2 / questions.length) * 20;
    const timeElapsed2 = 2700; // 45 minutes

    const resultData2 = {
        discipline: DISCIPLINE,
        student: STUDENTS[1],
        answers: answers2,
        score: scorePercentage2,
        scoreOn20: scoreOn20_2,
        totalQuestions: questions.length,
        correctCount: correctCount2,
        timeElapsed: timeElapsed2,
        timestamp: Date.now() + 1000 // Slightly different timestamp
    };

    // Submit both students
    try {
        const response1 = await fetch('http://localhost:3000/api/submit-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData1)
        });

        if (response1.ok) {
            console.log(`✅ ${STUDENTS[0].grade} ${STUDENTS[0].name}: ${scoreOn20_1.toFixed(1)}/20 (${correctCount1}/${questions.length} correct)`);
        } else {
            console.error(`❌ Failed for ${STUDENTS[0].name}`);
        }

        const response2 = await fetch('http://localhost:3000/api/submit-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData2)
        });

        if (response2.ok) {
            console.log(`✅ ${STUDENTS[1].grade} ${STUDENTS[1].name}: ${scoreOn20_2.toFixed(1)}/20 (${correctCount2}/${questions.length} correct)`);
        } else {
            console.error(`❌ Failed for ${STUDENTS[1].name}`);
        }
    } catch (err) {
        console.error(`Error submitting results:`, err);
    }

    console.log("\n📊 Simulation complete!");
    console.log(`Student 1 (${STUDENTS[0].grade}): High performer - ${scoreOn20_1.toFixed(1)}/20`);
    console.log(`Student 2 (${STUDENTS[1].grade}): Needs improvement - ${scoreOn20_2.toFixed(1)}/20`);
}

runSimulation();
