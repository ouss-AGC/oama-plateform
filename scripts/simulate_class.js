// Native fetch is available in Node 18+


const STUDENTS = [
    { name: "Ahmed Ben Ali", grade: "Sdt", matricule: "2025001" },
    { name: "Sami Mansouri", grade: "Sdt", matricule: "2025002" },
    { name: "Karim Zoughi", grade: "Sdt", matricule: "2025003" },
    { name: "Mohamed Tounsi", grade: "Caporal", matricule: "2025004" },
    { name: "Youssef Dridi", grade: "Sdt", matricule: "2025005" },
    { name: "Omar Belhaj", grade: "Sdt", matricule: "2025006" },
    { name: "Khaled Rezgui", grade: "Sdt", matricule: "2025007" },
    { name: "Walid Jlassi", grade: "Caporal", matricule: "2025008" },
    { name: "Nabil Fekih", grade: "Sdt", matricule: "2025009" },
    { name: "Hassan Mebarki", grade: "Sdt", matricule: "2025010" },
    { name: "Sofiane Amri", grade: "Sdt", matricule: "2025011" },
    { name: "Riad Bouazizi", grade: "Caporal", matricule: "2025012" },
    { name: "Mehdi Gharbi", grade: "Sdt", matricule: "2025013" },
    { name: "Amine Saidi", grade: "Sdt", matricule: "2025014" },
    { name: "Fares Khelifi", grade: "Sdt", matricule: "2025015" },
    { name: "Hedi Baccouche", grade: "Caporal", matricule: "2025016" },
    { name: "Bilel Trabelsi", grade: "Sdt", matricule: "2025017" },
    { name: "Skander Hmani", grade: "Sdt", matricule: "2025018" },
    { name: "Aymen Louati", grade: "Sdt", matricule: "2025019" },
    { name: "Marwen Gafsi", grade: "Caporal", matricule: "2025020" },
    { name: "Nizar Chebbi", grade: "Sdt", matricule: "2025021" },
    { name: "Ramzi Oueslati", grade: "Sdt", matricule: "2025022" },
    { name: "Zied Hammami", grade: "Sdt", matricule: "2025023" },
    { name: "Maher Ayari", grade: "Caporal", matricule: "2025024" },
    { name: "Lotfi Jaziri", grade: "Sdt", matricule: "2025025" },
    { name: "Mourad Ben Salem", grade: "Sdt", matricule: "2025026" },
    { name: "Anis Karray", grade: "Sdt", matricule: "2025027" }
];

const DISCIPLINE = "munitions"; // Main test discipline
const TOTAL_QUESTIONS = 57; // Munitions has 57 questions

// Helper to generate random answers
// targetScore: approximate score out of 20
function generateAnswers(targetScore) {
    const correctRatio = targetScore / 20;
    const answers = [];
    let correctCount = 0;

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
        // Simple logic: random chance based on target score
        // We assume correct answer is index 0 for simplicity of simulation logic, 
        // BUT we need to match the actual quiz data if we want the "View Details" to look right.
        // To do this properly, we should fetch the quiz data first.
        // However, for this simulation script, we might not have easy access to the JSON file content unless we read it.
        // Let's assume we read the JSON file.
    }
    return answers;
}

const fs = require('fs');
const path = require('path');

async function runSimulation() {
    console.log("Starting simulation...");

    // Read quiz data to know correct answers
    const quizPath = path.join(__dirname, '../client/public/quiz_data_munitions.json');
    const quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
    const questions = quizData.questions;

    for (const student of STUDENTS) {
        // Assign a random target score between 5 and 19
        // Bias towards 12-16 (passing)
        let targetScore;
        const rand = Math.random();
        if (rand < 0.1) targetScore = 5 + Math.random() * 5; // Fail (<10)
        else if (rand < 0.4) targetScore = 10 + Math.random() * 4; // Pass (10-14)
        else targetScore = 14 + Math.random() * 5; // Good (>14)

        const answers = [];
        let correctCount = 0;

        questions.forEach(q => {
            const isCorrect = Math.random() < (targetScore / 20);
            if (isCorrect) {
                answers.push(q.correctAnswer);
                correctCount++;
            } else {
                // Pick a wrong answer
                let wrong = (q.correctAnswer + 1) % 4; // Assuming 4 options
                answers.push(wrong);
            }
        });

        const scorePercentage = (correctCount / questions.length) * 100;
        const scoreOn20 = (correctCount / questions.length) * 20;
        const timeElapsed = 1200 + Math.floor(Math.random() * 1800); // 20-50 minutes

        const resultData = {
            discipline: DISCIPLINE,
            student: { ...student, className: "LASM 3" },
            answers: answers,
            score: scorePercentage,
            scoreOn20: scoreOn20,
            totalQuestions: questions.length,
            correctCount: correctCount,
            timeElapsed: timeElapsed,
            timestamp: Date.now() - Math.floor(Math.random() * 10000000) // Random time in past few days
        };

        try {
            const response = await fetch('http://localhost:3000/api/submit-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultData)
            });

            if (response.ok) {
                console.log(`Submitted for ${student.name}: ${scoreOn20.toFixed(1)}/20`);
            } else {
                console.error(`Failed for ${student.name}`);
            }
        } catch (err) {
            console.error(`Error submitting for ${student.name}:`, err);
        }
    }
    console.log("Simulation complete!");
}

runSimulation();
