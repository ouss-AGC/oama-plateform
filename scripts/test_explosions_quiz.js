/**
 * Test Script for Explosions GC31 Quiz
 * This script simulates a student taking the quiz and verifies auto-grading
 * Updated to support rigorous numeric grading with tolerance.
 */

// Test student data
const testStudent = {
    name: "Test Explosions",
    grade: "EOA",
    className: "GC31",
    matricule: "001"
};

// Sample answers for testing auto-grading
const testAnswers = {
    // Part 1: MCQ (18 questions, indices 0-17)
    mcq: [
        0, // Q1: Correct
        1, // Q2: Correct
        1, // Q3: Correct
        1, // Q4: Correct
        2, // Q5: Correct
        2, // Q6: Correct
        3, // Q7: Correct
        1, // Q8: Correct
        2, // Q9: Correct
        3, // Q10: Correct
        1, // Q11: Correct
        2, // Q12: Correct
        1, // Q13: Correct
        1, // Q14: Correct
        2, // Q15: Correct
        1, // Q16: Correct
        1, // Q17: Correct
        2  // Q18: Correct
    ],

    // Part 2: Exercises (index 18)
    part2: {
        "2.1": "ZA = 6.751, ZB = 7.595", // Exact match
        "2.2": "Ps0A = 1.534, Ps0B = 1.180, PrA = 3.085, PrB = 2.369", // Exact match
        "2.3": "t0fA = 6.861, t0fB = 7.080, isA = 5.261, isB = 4.177, irA = 10.577, irB = 8.387", // Exact match
        "2.4": "U = 345.2, 344.7, ta = 3.475, 3.578, q0 = 0.00827, 0.00490", // Exact match
        "2.5": "L'écart est dû à la diffraction et au clearing sur la petite structure.", // Contains "diffraction", "clearing"
        "2.6": "Renforcement par rigidité, masse, et couche sacrificielle." // Contains "rigidité", "masse", "sacrificiel"
    },

    // Part 3: Exercises (index 19)
    part3: {
        "3.1": "Impulsion = 492, xmax = 23.44", // Exact match
        "3.2": "2400, 114.35", // Exact match
        "3.3": "3000, 142.95"  // Exact match
    }
};

async function runTest() {
    console.log("🧪 Starting Explosions GC31 Quiz Test (Rigorous Grading)\n");
    console.log("=".repeat(60));

    // Load quiz data
    console.log("\n📋 Loading quiz data...");
    const quizData = require('../client/public/quiz_data_explosions.json');
    console.log(`✅ Quiz loaded: ${quizData.quizTitle}`);

    // Flatten questions
    let allQuestions = [];
    quizData.sections.forEach(section => {
        if (section.type === 'exercise') {
            allQuestions.push({
                id: section.id,
                type: 'exercise',
                title: section.title,
                questions: section.questions
            });
        } else {
            section.questions.forEach(q => {
                allQuestions.push({ ...q, type: 'qcm' });
            });
        }
    });

    // Prepare answers
    let answers = new Array(allQuestions.length).fill(null);
    for (let i = 0; i < 18; i++) answers[i] = testAnswers.mcq[i];
    answers[18] = testAnswers.part2;
    answers[19] = testAnswers.part3;

    // Simulate Grading
    console.log("\n📐 Simulating Grading Logic...");
    let earnedPoints = 0;
    let totalPoints = 0;
    let detailedResults = [];

    allQuestions.forEach((q, index) => {
        if (q.type === 'exercise') {
            let questionScore = 0;
            const maxPoints = q.questions.reduce((sum, subQ) => sum + subQ.points, 0);
            totalPoints += maxPoints;

            const studentAnswerObj = answers[index];

            q.questions.forEach(subQ => {
                const subAnswer = studentAnswerObj[subQ.id] || "";
                let subScore = 0;

                if (subQ.validation) {
                    if (subQ.validation.type === 'split_criteria') {
                        // Keyword based
                        let points = 0;
                        const keywords = subQ.validation.keywords || subQ.validation.values || [];
                        let matchCount = 0;
                        keywords.forEach(val => {
                            if (subAnswer.toLowerCase().includes(val.toLowerCase())) matchCount++;
                        });

                        // Strict proportional
                        points = (matchCount / keywords.length) * subQ.points;
                        // Cap at max (in case keywords > points or logic differs)
                        subScore = Math.min(points, subQ.points);

                    } else if (subQ.validation.type.includes('numeric')) {
                        // Numeric Tolerance
                        const tolerance = subQ.validation.tolerance || 0.02;
                        const parts = subQ.validation.parts || (subQ.validation.value !== undefined ? [{ value: subQ.validation.value }] : []);

                        const sent = subAnswer.replace(/,/g, '.');
                        const numbersFound = sent.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];

                        let partsPassed = 0;
                        parts.forEach(part => {
                            const expected = part.value;
                            const foundMatch = numbersFound.some(num => {
                                const diff = Math.abs(num - expected);
                                const allowedDiff = Math.abs(expected * tolerance);
                                return diff <= (allowedDiff + 1e-6);
                            });
                            if (foundMatch) partsPassed++;
                        });

                        if (parts.length > 0) {
                            subScore = (partsPassed / parts.length) * subQ.points;
                        }
                    }
                }
                questionScore += subScore;
                detailedResults.push(`   - ${subQ.id}: ${subScore.toFixed(2)} / ${subQ.points} pts`);
            });
            earnedPoints += questionScore;
            console.log(`✅ Exercise ${q.title} Graded: ${questionScore.toFixed(2)} / ${maxPoints} pts`);
            detailedResults.forEach(r => console.log(r));
            detailedResults = []; // reset for next
        } else {
            // MCQ
            totalPoints += 0.5;
            if (answers[index] === q.correctAnswer) {
                earnedPoints += 0.5;
            }
        }
    });

    console.log("\n📊 Final Results:");
    console.log(`   Earned Points: ${earnedPoints.toFixed(2)} / ${totalPoints}`);
    const scoreOn20 = (earnedPoints / totalPoints) * 20;
    console.log(`   Score on 20: ${scoreOn20.toFixed(2)} / 20`);
    console.log(`   Percentage: ${((earnedPoints / totalPoints) * 100).toFixed(2)}%`);

    if (scoreOn20 >= 19.5) {
        console.log("\n🎉 SUCCESS: Grading logic working perfectly!");
    } else {
        console.log("\n⚠️ WARNING: Score lower than expected. Check grading logic.");
    }
}

runTest();
