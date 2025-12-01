import jsPDF from 'jspdf';

interface StudentInfo {
    name: string;
    grade: string;
    className: string;
    matricule: string;
}

interface QuizResult {
    student: StudentInfo;
    score: number;
    scoreOn20: number;
    discipline: string;
    timestamp: number;
}

// Discipline-specific colors
const disciplineColors = {
    munitions: { primary: [45, 80, 22] as [number, number, number], secondary: [212, 175, 55] as [number, number, number] },
    agc: { primary: [74, 85, 104] as [number, number, number], secondary: [212, 175, 55] as [number, number, number] },
    genie: { primary: [192, 86, 33] as [number, number, number], secondary: [212, 175, 55] as [number, number, number] }
};

const disciplineNames = {
    munitions: 'GENERALITES SUR LES MUNITIONS LASM 3',
    agc: 'ARMEMENT GROS CALIBRE (AGC) POUR LASM 2',
    genie: 'GENIE MILITAIRE 4 LASM 2'
};

export const generateCertificate = async (result: QuizResult) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const colors = disciplineColors[result.discipline as keyof typeof disciplineColors] || disciplineColors.munitions;
    const disciplineName = disciplineNames[result.discipline as keyof typeof disciplineNames] || 'DISCIPLINE INCONNUE';

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

    let logoDataUrl = '';
    let bgImageDataUrl = '';
    let signatureDataUrl = '';
    try {
        logoDataUrl = await loadImage('/academy-logo.png');
        bgImageDataUrl = await loadImage('/cert_background.png');
        signatureDataUrl = await loadImage('/signature.png');
    } catch (err) {
        console.error('Failed to load images:', err);
    }

    // Background
    doc.setFillColor(252, 248, 240);
    doc.rect(0, 0, 297, 210, 'F');

    // Add decorative background (transparency removed for stability)
    if (bgImageDataUrl) {
        doc.addImage(bgImageDataUrl, 'PNG', 0, 0, 297, 210);
    }

    // Borders
    doc.setDrawColor(0, 128, 128);
    doc.setLineWidth(4);
    doc.rect(8, 8, 281, 194);

    doc.setDrawColor(...colors.secondary);
    doc.setLineWidth(2);
    doc.rect(12, 12, 273, 186);

    doc.setFillColor(0, 100, 150);
    const patternSize = 3;
    const patternSpacing = 6;

    for (let x = 16; x < 281; x += patternSpacing) {
        doc.rect(x, 16, patternSize, patternSize, 'F');
        doc.rect(x, 191, patternSize, patternSize, 'F');
    }

    for (let y = 16; y < 194; y += patternSpacing) {
        doc.rect(16, y, patternSize, patternSize, 'F');
        doc.rect(278, y, patternSize, patternSize, 'F');
    }

    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(1.5);
    doc.rect(22, 22, 253, 166);

    doc.setDrawColor(...colors.secondary);
    doc.setLineWidth(0.5);
    doc.rect(24, 24, 249, 162);

    // Academy logo at top LEFT corner
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 30, 30, 25, 25);
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(...colors.primary);
    doc.text("CERTIFICAT DE RÉUSSITE", 148.5, 70, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("ACADÉMIE MILITAIRE - OAMA", 148.5, 80, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(16);
    doc.setTextColor(80, 80, 80);
    doc.text("Décerné à", 148.5, 95, { align: "center" });

    doc.setFont("times", "bolditalic");
    doc.setFontSize(32);
    doc.setTextColor(0, 0, 0);
    doc.text(`${result.student.grade} ${result.student.name}`, 148.5, 110, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text("Pour avoir complété avec succès l'évaluation de :", 148.5, 125, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...colors.primary);
    doc.text(disciplineName, 148.5, 140, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(`Score obtenu : ${result.scoreOn20.toFixed(1)}/20`, 148.5, 155, { align: "center" });

    const date = new Date(result.timestamp).toLocaleDateString('fr-FR');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Fait le ${date}`, 60, 178, { align: "center" });

    // Handwritten signature image ABOVE name
    if (signatureDataUrl) {
        doc.addImage(signatureDataUrl, 'PNG', 200, 160, 40, 20);
    }

    // Signature text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Lt Col Oussama Atoui", 220, 184, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Instructeur Armes et Munitions", 220, 189, { align: "center" });

    doc.save(`Certificat_${result.student.name.replace(/\s+/g, '_')}.pdf`);
};

export const generateVisualCertificate = async (result: QuizResult): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1122;
    canvas.height = 794;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    const colorMap = {
        munitions: { primary: '#2D5016', secondary: '#D4AF37' },
        agc: { primary: '#4A5568', secondary: '#D4AF37' },
        genie: { primary: '#C05621', secondary: '#D4AF37' }
    };
    const colors = colorMap[result.discipline as keyof typeof colorMap] || colorMap.munitions;
    const disciplineName = disciplineNames[result.discipline as keyof typeof disciplineNames] || 'DISCIPLINE INCONNUE';

    const logoImg = new Image();
    logoImg.src = '/academy-logo.png';

    const bgImg = new Image();
    bgImg.src = '/cert_background.png';

    const sigImg = new Image();
    sigImg.src = '/signature.png';

    await new Promise<void>((resolve) => {
        let loaded = 0;
        const checkLoaded = () => {
            loaded++;
            if (loaded >= 3) resolve();
        };

        logoImg.onload = checkLoaded;
        logoImg.onerror = checkLoaded;
        bgImg.onload = checkLoaded;
        bgImg.onerror = checkLoaded;
        sigImg.onload = checkLoaded;
        sigImg.onerror = checkLoaded;

        setTimeout(() => resolve(), 2000);
    });

    ctx.fillStyle = '#FCF8F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (bgImg.complete && bgImg.naturalHeight !== 0) {
        ctx.globalAlpha = 0.70;
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
    }

    ctx.strokeStyle = '#008080';
    ctx.lineWidth = 12;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

    ctx.fillStyle = '#006496';
    const patternSize = 8;
    const patternSpacing = 18;

    for (let x = 48; x < canvas.width - 48; x += patternSpacing) {
        ctx.fillRect(x, 48, patternSize, patternSize);
        ctx.fillRect(x, canvas.height - 56, patternSize, patternSize);
    }

    for (let y = 48; y < canvas.height - 48; y += patternSpacing) {
        ctx.fillRect(48, y, patternSize, patternSize);
        ctx.fillRect(canvas.width - 56, y, patternSize, patternSize);
    }

    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 4;
    ctx.strokeRect(66, 66, canvas.width - 132, canvas.height - 132);

    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 2;
    ctx.strokeRect(72, 72, canvas.width - 144, canvas.height - 144);

    // Logo at top LEFT corner
    if (logoImg.complete && logoImg.naturalHeight !== 0) {
        ctx.drawImage(logoImg, 90, 90, 70, 70);
    }

    ctx.fillStyle = colors.primary;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICAT DE RÉUSSITE', canvas.width / 2, 200);

    ctx.fillStyle = '#666';
    ctx.font = '20px Arial';
    ctx.fillText('ACADÉMIE MILITAIRE - OAMA', canvas.width / 2, 230);

    ctx.fillStyle = '#555';
    ctx.font = 'italic 22px Georgia';
    ctx.fillText('Décerné à', canvas.width / 2, 280);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 36px Georgia';
    ctx.fillText(`${result.student.grade} ${result.student.name}`, canvas.width / 2, 330);

    ctx.fillStyle = '#555';
    ctx.font = '18px Arial';
    ctx.fillText('Pour avoir complété avec succès l\'évaluation de :', canvas.width / 2, 380);

    ctx.fillStyle = colors.primary;
    ctx.font = 'bold 32px Arial';
    ctx.fillText(disciplineName, canvas.width / 2, 440);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Score obtenu : ${result.scoreOn20.toFixed(1)}/20`, canvas.width / 2, 500);

    const date = new Date(result.timestamp).toLocaleDateString('fr-FR');
    ctx.fillStyle = '#444';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Fait le ${date}`, 180, 680);

    // Handwritten signature ABOVE name
    if (sigImg.complete && sigImg.naturalHeight !== 0) {
        ctx.drawImage(sigImg, canvas.width - 380, 590, 150, 75);
    }

    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#000';
    ctx.fillText('Lt Col Oussama Atoui', canvas.width - 305, 685);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#555';
    ctx.fillText('Instructeur Armes et Munitions', canvas.width - 305, 705);

    return canvas.toDataURL('image/png');
};
