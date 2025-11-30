const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Middleware to parse JSON bodies
app.use(express.json());

// --- Session State (In-Memory) ---
let sessionState = {
    currentPin: null,
    isQuizStarted: false,
    participants: [],
    results: [] // Store quiz results here
};

// --- API Endpoints ---

// Admin: Generate PIN
app.post('/api/admin/generate-pin', (req, res) => {
    // Generate random 6-digit PIN
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    sessionState.currentPin = newPin;
    sessionState.isQuizStarted = false;
    sessionState.participants = []; // Reset participants
    sessionState.results = []; // Reset results
    console.log(`New Session Started. PIN: ${newPin}`);
    res.json({ pin: newPin });
});

// Admin: Get Session Info (including results)
app.get('/api/admin/session', (req, res) => {
    res.json({
        pin: sessionState.currentPin,
        connectedCount: sessionState.participants.length,
        participants: sessionState.participants,
        status: sessionState.isQuizStarted ? 'started' : (sessionState.currentPin ? 'waiting' : 'idle'),
        results: sessionState.results
    });
});

// Admin: Start Quiz
app.post('/api/admin/start-quiz', (req, res) => {
    if (!sessionState.currentPin) {
        return res.status(400).json({ error: "No active session" });
    }
    sessionState.isQuizStarted = true;
    console.log("Quiz Started!");
    res.json({ success: true });
});

// Student: Validate PIN
app.post('/api/validate-pin', (req, res) => {
    const { pin } = req.body;
    if (!sessionState.currentPin) {
        return res.status(400).json({ error: "Aucune session active." });
    }
    if (pin === sessionState.currentPin) {
        res.json({ valid: true });
    } else {
        res.status(401).json({ valid: false, error: "Code PIN incorrect." });
    }
});

// Student: Join Session
app.post('/api/join-session', (req, res) => {
    const { student } = req.body;
    if (!sessionState.currentPin) {
        return res.status(400).json({ error: "Aucune session active." });
    }
    // Add student if not already present (simple check by matricule)
    const exists = sessionState.participants.find(p => p.matricule === student.matricule);
    if (!exists) {
        sessionState.participants.push(student);
    }
    res.json({ success: true });
});

// Student: Submit Quiz Result
app.post('/api/submit-quiz', (req, res) => {
    const result = req.body;
    sessionState.results.push(result);
    console.log(`Result received for ${result.student.name}`);
    res.json({ success: true });
});

// Student: Check Quiz Status (Polling)
app.get('/api/quiz-status', (req, res) => {
    res.json({ started: sessionState.isQuizStarted });
});

// Admin: Generate Test Data (for production testing)
app.post('/api/generate-test-data', (req, res) => {
    const disciplines = ['munitions', 'agc', 'genie'];
    const grades = ['EOA', 'Cpl', 'Sgt', 'Adj', 'Asp'];
    const firstNames = ['Ahmed', 'Sami', 'Karim', 'Mohamed', 'Youssef', 'Omar', 'Khaled', 'Walid', 'Nabil', 'Hassan'];
    const lastNames = ['Ben Ali', 'Mansouri', 'Zoughi', 'Tounsi', 'Dridi', 'Belhaj', 'Rezgui', 'Jlassi', 'Fekih', 'Mebarki'];

    // Generate 10 random results
    for (let i = 0; i < 10; i++) {
        const randomGrade = grades[Math.floor(Math.random() * grades.length)];
        const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const randomDiscipline = disciplines[Math.floor(Math.random() * disciplines.length)];
        const randomScore = Math.floor(Math.random() * 16) + 5; // Score between 5 and 20

        const testResult = {
            discipline: randomDiscipline,
            student: {
                grade: randomGrade,
                name: `${randomFirstName} ${randomLastName}`,
                matricule: `MAT${1000 + i}`,
                classe: 'LASM 3'
            },
            answers: new Array(20).fill(null).map(() => Math.floor(Math.random() * 4)),
            score: (randomScore / 20) * 100,
            scoreOn20: randomScore,
            totalQuestions: 20,
            correctCount: randomScore,
            timeElapsed: Math.floor(Math.random() * 3600),
            timestamp: Date.now() - i * 1000
        };

        sessionState.results.push(testResult);
    }

    res.json({ success: true, message: `Generated 10 test results` });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
const fs = require('fs');
app.get('*', (req, res) => {
    const indexPath = path.join(process.cwd(), 'client', 'dist', 'index.html');
    console.log("Serving index.html from:", indexPath);
    if (fs.existsSync(indexPath)) {
        res.send(fs.readFileSync(indexPath, 'utf8'));
    } else {
        res.status(404).send("Index file not found at " + indexPath);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
