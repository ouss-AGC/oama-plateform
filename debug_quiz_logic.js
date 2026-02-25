const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'client/public/quiz_data_explosions.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(rawData);

console.log('Loaded JSON. Sections found:', data.sections ? data.sections.length : 'None');

let allQuestions = [];
if (data.sections) {
    data.sections.forEach((section, idx) => {
        console.log(`Processing Section ${idx + 1}: ${section.id}, Type: ${section.type}`);
        if (section.type === 'exercise') {
            console.log(`  -> Treating as Exercise (1 item)`);
            allQuestions.push({
                id: section.id,
                question: section.title,
                type: 'exercise',
                title: section.title,
                description: section.description,
                context: section.context,
                data: section.data,
                questions: section.questions,
                sectionTitle: section.title
            });
        } else {
            console.log(`  -> Treating as QCM (${section.questions ? section.questions.length : 0} items)`);
            if (section.questions) {
                section.questions.forEach(q => {
                    allQuestions.push({ ...q, type: 'qcm', sectionTitle: section.title });
                });
            }
        }
    });
} else if (data.questions) {
    console.log('Using flat questions structure');
    allQuestions = data.questions.map(q => ({ ...q, type: 'qcm' }));
}

console.log('Total flattened questions:', allQuestions.length);
allQuestions.forEach((q, i) => {
    console.log(`[${i}] ID: ${q.id}, Type: ${q.type}`);
});
