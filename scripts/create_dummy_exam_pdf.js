
import { jsPDF } from "jspdf";
import { fileURLToPath } from 'url';
import fs from "fs";
import path from "path";

const doc = new jsPDF();

doc.setFontSize(22);
doc.text("EXAMEN FINAL - EXPLOSIONS GC31", 105, 20, { align: "center" });

doc.setFontSize(16);
doc.text("Sujet de l'Examen", 20, 40);

doc.setFontSize(12);
doc.text("Partie 1: QCM (Questions 1-18)", 20, 60);
doc.text("Répondez sur la plateforme.", 20, 70);

doc.text("Partie 2: Problème de Blast", 20, 90);
doc.text("Données: W = 26 g TNT, Ra = 2 m, Rb = 2.25 m", 20, 100);
doc.text("Calculez les paramètres de l'onde de choc.", 20, 110);

doc.text("Partie 3: Analyse SDOF", 20, 130);
doc.text("Analysez la réponse de la structure pour les 3 cas de charge.", 20, 140);

doc.setFontSize(10);
doc.text("Bonne chance !", 105, 200, { align: "center" });

const pdfOutput = doc.output("arraybuffer");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.resolve(__dirname, "../client/public/sujet_explosions.pdf");
fs.writeFileSync(outputPath, Buffer.from(pdfOutput));

console.log(`PDF created at ${outputPath}`);
