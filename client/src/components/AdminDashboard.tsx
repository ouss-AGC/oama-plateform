import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart2, Clock, LogOut, Download, FileText, List, Award, Play, RefreshCw, Key, BarChart3 } from 'lucide-react';
import AdvancedAnalytics from './AdvancedAnalytics';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';
import { generateIndividualReport } from '../utils/reportGenerator';


interface QuizResult {
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
    isPractice?: boolean; // Flag for practice quiz
}

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [results, setResults] = useState<QuizResult[]>([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
    const [quizTypeFilter, setQuizTypeFilter] = useState<'all' | 'official' | 'practice'>('all'); // New filter
    const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);
    const [isExportingBatch, setIsExportingBatch] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

    // Session Management State
    const [pin, setPin] = useState<string | null>(null);
    const [reportPin, setReportPin] = useState<string>('123456');
    const [connectedCount, setConnectedCount] = useState(0);
    const [resultCount, setResultCount] = useState(0);
    const [participants, setParticipants] = useState<any[]>([]);
    const [quizStatus, setQuizStatus] = useState('idle');

    useEffect(() => {
        const adminAuth = localStorage.getItem('adminAuthenticated');
        if (!adminAuth) {
            navigate('/admin');
            return;
        }

        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        setResults(history);

        // Initial fetch of session status
        fetchSessionStatus();

        // Poll for session updates
        const interval = setInterval(fetchSessionStatus, 3000);
        return () => clearInterval(interval);
    }, [navigate]);

    const fetchSessionStatus = () => {
        fetch('/api/admin/session')
            .then(res => res.json())
            .then(data => {
                setPin(data.pin);
                setReportPin(data.reportPin || '123456');
                setQuizStatus(data.isQuizStarted ? 'started' : 'waiting'); // Updated logic for quizStatus
                setConnectedCount(data.participantCount); // Updated to participantCount
                setResultCount(data.resultCount); // New line
                setParticipants(data.participants || []);
                // The original `setQuizStatus(data.status);` is replaced by the more specific `setQuizStatus(data.isQuizStarted ? 'started' : 'waiting');`
                if (data.results) {
                    setResults(data.results);
                }
            })
            .catch(err => console.error("Failed to fetch session:", err));
    };

    const handleLogout = () => {
        localStorage.removeItem('adminAuthenticated');
        navigate('/');
    };

    const generatePin = async () => {
        try {
            const res = await fetch('/api/admin/generate-pin', { method: 'POST' });
            const data = await res.json();
            setPin(data.pin);
            setQuizStatus('waiting');

            // Clear all previous quiz results for a fresh session
            localStorage.removeItem('quizHistory');
            setResults([]); // Clear results from state

            console.log('✅ Nouveau PIN généré. Toutes les données de test ont été effacées.');
        } catch (err) {
            console.error("Failed to generate PIN:", err);
        }
    };

    const updateReportPin = async () => {
        const newPin = prompt("Entrez le nouveau PIN pour le téléchargement des rapports :", reportPin);
        if (newPin && newPin.length >= 4) {
            try {
                await fetch('/api/admin/set-report-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: newPin })
                });
                setReportPin(newPin);
                alert("PIN du rapport mis à jour !");
            } catch (err) {
                console.error("Failed to set report PIN:", err);
            }
        }
    };

    const startQuiz = async () => {
        try {
            await fetch('/api/admin/start-quiz', { method: 'POST' });
            setQuizStatus('started');
            alert("Le quiz a commencé ! Tous les étudiants dans la salle d'attente vont être redirigés.");
        } catch (err) {
            console.error("Failed to start quiz:", err);
        }
    };

    // Filter by discipline and quiz type, then sort by matricule
    const filteredResults = results
        .filter(r => selectedDiscipline === 'all' || r.discipline === selectedDiscipline)
        .filter(r => {
            if (quizTypeFilter === 'all') return true;
            if (quizTypeFilter === 'practice') return r.isPractice === true;
            if (quizTypeFilter === 'official') return !r.isPractice;
            return true;
        })
        .sort((a, b) => {
            // Sort by matricule in ascending order (1, 2, 3, ...)
            const matriculeA = parseInt(a.student.matricule) || 0;
            const matriculeB = parseInt(b.student.matricule) || 0;
            return matriculeA - matriculeB;
        });

    const stats = {
        totalParticipants: filteredResults.length,
        averageScore: filteredResults.length > 0
            ? filteredResults.reduce((acc, curr) => acc + curr.scoreOn20, 0) / filteredResults.length
            : 0,
        passRate: filteredResults.length > 0
            ? (filteredResults.filter(r => r.scoreOn20 >= 10).length / filteredResults.length) * 100
            : 0,
        avgTime: filteredResults.length > 0
            ? filteredResults.reduce((acc, curr) => acc + curr.timeElapsed, 0) / filteredResults.length
            : 0
    };

    const exportCSV = () => {
        const headers = ["N° Registre", "Grade", "Nom", "Classe", "Score /20", "Temps (s)", "Date", "Discipline"];
        const csvContent = [
            headers.join(','),
            ...filteredResults.map(r => [
                r.student.matricule,
                r.student.grade,
                r.student.name,
                r.student.className,
                r.scoreOn20.toFixed(2),
                r.timeElapsed,
                new Date(r.timestamp).toLocaleDateString(),
                r.discipline
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `resultats_agc_${Date.now()}.csv`;
        link.click();
    };

    const exportFullList = async () => {
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

        // Load signature and stamp
        let signatureDataUrl = '';
        let stampDataUrl = '';
        try {
            signatureDataUrl = await loadImage('/signature.png');
            stampDataUrl = await loadImage('/golden_stamp_pdf.png'); // PDF-specific stamp
        } catch (err) {
            console.error('Failed to load assets:', err);
        }

        // Header with signature
        doc.setFontSize(20);
        doc.setTextColor(45, 80, 22);
        doc.text("LISTE COMPLÈTE DES RÉSULTATS", 105, 20, { align: "center" });

        // Add Golden Stamp (Top Right)
        if (stampDataUrl) {
            doc.addImage(stampDataUrl, 'PNG', 160, 10, 35, 35);
        }

        const disciplineNames: { [key: string]: string } = {
            'all': 'TOUTES',
            'munitions': 'Généralités sur les munitions',
            'agc': 'Armement Gros Calibre AGC',
            'genie': 'Génie Militaire 4 LASM 2',
            'explosions': 'Examen Calcul des effets des explosions sur les structures'
        };
        const disciplineDisplay = disciplineNames[selectedDiscipline] || selectedDiscipline.toUpperCase();

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`Discipline: ${disciplineDisplay}`, 105, 30, { align: "center" });

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Généré le ${new Date().toLocaleDateString()}`, 105, 40, { align: "center" });

        // Add signature
        if (signatureDataUrl) {
            doc.addImage(signatureDataUrl, 'PNG', 20, 40, 40, 20);
        }

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Lt Col Oussama Atoui", 40, 63, { align: "center" });
        doc.text("Instructeur Armes et Munitions", 40, 68, { align: "center" });

        // Stats summary
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`Participants: ${stats.totalParticipants} | Moyenne: ${stats.averageScore.toFixed(2)}/20 | Réussite: ${Math.round(stats.passRate)}%`, 105, 80, { align: "center" });

        // Debug: Log filtered results
        console.log('📊 Filtered Results for PDF:', filteredResults);
        console.log('📊 Total results:', filteredResults.length);

        const tableData = filteredResults.map((r) => {
            console.log('📋 Mapping result:', r.student);
            return [
                r.student.matricule,
                r.student.grade,
                r.student.name,
                r.student.className,
                r.scoreOn20.toFixed(2)
            ];
        });

        console.log('📊 Table Data:', tableData);

        autoTable(doc, {
            startY: 90,
            head: [['N° Registre', 'Grade', 'Nom', 'Classe', 'Note /20']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [45, 80, 22] },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const score = parseFloat(data.cell.raw as string);
                    if (score < 10) {
                        data.cell.styles.textColor = [200, 0, 0];
                    } else if (score >= 16) {
                        data.cell.styles.textColor = [0, 100, 0];
                    }
                }
            }
        });

        doc.save('liste_complete_resultats.pdf');
    };

    const downloadAllReports = async () => {
        if (filteredResults.length === 0) return;

        setIsExportingBatch(true);
        setExportProgress({ current: 0, total: filteredResults.length });

        const zip = new JSZip();

        // Cache for quiz questions to avoid redundant fetches
        const questionsCache: Record<string, any[]> = {};

        try {
            for (let i = 0; i < filteredResults.length; i++) {
                const result = filteredResults[i];
                setExportProgress({ current: i + 1, total: filteredResults.length });

                // Determine which questions file to fetch
                const isPractice = result.isPractice;
                const discipline = result.discipline;
                let fileName = isPractice
                    ? `${discipline}_practice.json`
                    : `quiz_data_${discipline === 'explosions' ? 'explosions_v2' : discipline}.json`;

                if (discipline === 'genie' && !isPractice) {
                    fileName = 'quiz_data_genie_v2.json';
                }

                if (!questionsCache[fileName]) {
                    const res = await fetch(`/${fileName}`);
                    const data = await res.json();

                    let flat: any[] = [];
                    if (data.sections) {
                        data.sections.forEach((section: any) => {
                            if (section.type === 'exercise') {
                                const subQs = section.questions || [];
                                subQs.forEach((subQ: any) => {
                                    flat.push({
                                        ...subQ,
                                        id: `${section.id}_${subQ.id}`,
                                        parentId: section.id,
                                        type: 'exercise',
                                        question: subQ.question || section.title,
                                        options: ["(Exercice de calcul)"],
                                        correctAnswer: -1
                                    });
                                });
                            } else {
                                if (section.questions) {
                                    section.questions.forEach((q: any) => {
                                        flat.push({ ...q, type: 'qcm', parentId: section.id });
                                    });
                                }
                            }
                        });
                    } else {
                        flat = data.questions.map((q: any) => ({ ...q, type: 'qcm' }));
                    }
                    questionsCache[fileName] = flat;
                }

                const questions = questionsCache[fileName];
                const doc = await generateIndividualReport(result as any, questions as any);
                const pdfBlob = doc.output('blob');

                const safeName = result.student.name.replace(/[\\/:*?"<>|]/g, '_');
                const fileNameInZip = `${result.student.matricule}_${safeName}.pdf`;
                zip.file(fileNameInZip, pdfBlob);
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `rapports_oama_${selectedDiscipline}_${Date.now()}.zip`;
            link.click();

        } catch (error) {
            console.error("Bulk download failed:", error);
            alert("Erreur lors du téléchargement groupé.");
        } finally {
            setIsExportingBatch(false);
        }
    };

    // Show Advanced Analytics if requested
    if (showAdvancedAnalytics) {
        // Pass quizType to allow fetching correct questions
        return <AdvancedAnalytics
            results={filteredResults}
            discipline={selectedDiscipline}
            quizType={quizTypeFilter}
            onBack={() => setShowAdvancedAnalytics(false)}
        />;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navbar */}
            <nav className="bg-military-green text-white px-6 py-4 shadow-md flex justify-between items-center">
                <div className="flex items-center">
                    <img src="/academy-logo.png" alt="Logo" className="h-8 w-8 mr-3" />
                    <span className="font-bold text-lg">Administration de la plate-forme</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center text-sm hover:text-gray-300 transition-colors"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                </button>
            </nav>

            <div className="max-w-7xl mx-auto p-6">

                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => navigate('/admin/certificates')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center shadow-sm"
                    >
                        <Award className="w-4 h-4 mr-2" />
                        Voir Modèles Certificats
                    </button>
                </div>

                {/* Session Control Panel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            <Key className="w-6 h-6 mr-2 text-military-green" />
                            Contrôle de Session
                        </h2>
                        <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${quizStatus === 'started' ? 'bg-green-100 text-green-800' :
                                quizStatus === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {quizStatus === 'started' ? 'Quiz En Cours' :
                                    quizStatus === 'waiting' ? 'En Attente' : 'Inactif'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* PIN Display */}
                        <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center border border-gray-200 relative group">
                            <span className="text-gray-500 text-sm mb-1">PIN de Session</span>
                            <div className="text-4xl font-mono font-bold text-military-green tracking-widest mb-4 transition-all duration-300 group-hover:blur-0 blur-md">
                                {pin || '----'}
                            </div>

                            {/* QR Code (also blurred) */}
                            {pin && (
                                <div className="mb-4 p-2 bg-white rounded shadow-sm border border-gray-100 transition-all duration-300 group-hover:blur-0 blur-md">
                                    <QRCodeCanvas value={`${window.location.origin}/?pin=${pin}`} size={128} />
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
                                <span className="bg-white/80 px-2 py-1 rounded text-xs font-bold text-gray-500 border border-gray-200 shadow-sm">Survolez pour voir</span>
                            </div>

                            <button
                                onClick={generatePin}
                                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Générer un nouveau PIN
                            </button>
                        </div>

                        {/* Report Download PIN */}
                        <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center border border-gray-200 relative group">
                            <span className="text-gray-500 text-sm mb-1">PIN Rapport Individual</span>
                            <div className="text-4xl font-mono font-bold text-orange-600 tracking-widest mb-4 transition-all duration-300 group-hover:blur-0 blur-md">
                                {reportPin}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
                                <span className="bg-white/80 px-2 py-1 rounded text-xs font-bold text-gray-500 border border-gray-200 shadow-sm">Survolez pour voir</span>
                            </div>

                            <button
                                onClick={updateReportPin}
                                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Modifier le PIN Rapport
                            </button>
                        </div>

                        {/* Participation tracking */}
                        <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center border border-gray-200 relative group min-w-[200px]">
                            <span className="text-gray-500 text-sm mb-2 font-bold uppercase tracking-wider">Participation</span>
                            <div className="flex gap-8">
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl font-bold text-military-green">{connectedCount}</span>
                                    <span className="text-[10px] text-gray-400 uppercase font-black">Connectés</span>
                                </div>
                                <div className="flex flex-col items-center border-l border-gray-200 pl-8">
                                    <span className="text-3xl font-bold text-orange-600">{resultCount}</span>
                                    <span className="text-[10px] text-gray-400 uppercase font-black">Rapports</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-2 font-medium">
                                {quizStatus === 'started' ? '● Quiz en cours' : '🕒 En salle d\'attente'}
                            </span>

                            {/* Tooltip / Dropdown for Student List */}
                            {participants.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto hidden group-hover:block transition-all duration-300">
                                    <div className="p-2">
                                        <p className="text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-tighter">Liste des présences :</p>
                                        {participants.map((p, idx) => (
                                            <div key={idx} className="text-xs text-gray-700 px-2 py-1.5 hover:bg-gray-50 rounded flex justify-between border-b border-gray-50 last:border-0">
                                                <span className="font-medium">{p.grade} {p.name || p.fullName}</span>
                                                <span className="text-gray-400 text-[10px] font-mono">{p.className}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center">
                            <button
                                onClick={startQuiz}
                                disabled={!pin || quizStatus === 'started'}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center transition-all transform hover:-translate-y-1
                                    ${!pin || quizStatus === 'started'
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-military-green text-white hover:bg-opacity-90'}`}
                            >
                                <Play className="w-6 h-6 mr-2" />
                                {quizStatus === 'started' ? 'Quiz Lancé' : 'Lancer le Quiz'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center bg-white p-2 rounded-lg shadow-sm">
                        <span className="text-gray-500 mr-3 text-sm font-medium px-2">Discipline :</span>
                        <select
                            value={selectedDiscipline}
                            onChange={(e) => setSelectedDiscipline(e.target.value)}
                            className="bg-gray-50 border-none text-gray-700 font-medium focus:ring-0 cursor-pointer"
                        >
                            <option value="all">Toutes les disciplines</option>
                            <option value="munitions">Generalites sur les Munitions LASM 3</option>
                            <option value="agc">Armement Gros Calibre (AGC) pour LASM 2</option>
                            <option value="genie">Genie Militaire 4 LASM 2</option>
                            <option value="explosions">Examen Calcul des effets des explosions sur les structures</option>
                        </select>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setShowAdvancedAnalytics(true);
                                if (quizTypeFilter === 'all') {
                                    setQuizTypeFilter('official');
                                }
                            }}
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-blue-700 font-medium transition-all transform hover:scale-105"
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Statistiques Avancées
                        </button>
                        <button onClick={exportFullList} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 font-medium">
                            <List className="w-4 h-4 mr-2" />
                            Liste Complète
                        </button>
                        <button
                            onClick={downloadAllReports}
                            disabled={isExportingBatch || filteredResults.length === 0}
                            className={`flex items-center px-4 py-2 bg-military-green text-white rounded-lg shadow-sm font-medium transition-all
                                ${isExportingBatch ? 'opacity-70 cursor-wait' : 'hover:bg-opacity-90'}`}
                        >
                            {isExportingBatch ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    {exportProgress.current}/{exportProgress.total}...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Individuels (ZIP)
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 text-sm font-medium">Moyenne</h3>
                            <BarChart2 className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{stats.averageScore.toFixed(2)}/20</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 text-sm font-medium">Taux de Réussite</h3>
                            <Award className="w-5 h-5 text-yellow-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{Math.round(stats.passRate)}%</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 text-sm font-medium">Temps Moyen</h3>
                            <Clock className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">
                            {Math.floor(stats.avgTime / 60)}:{(Math.round(stats.avgTime % 60)).toString().padStart(2, '0')}
                        </p>
                    </div>
                </div>

                {/* Student List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800">Liste des Étudiants</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-medium">N° Registre</th>
                                    <th className="px-6 py-3 font-medium">Grade</th>
                                    <th className="px-6 py-3 font-medium">Nom</th>
                                    <th className="px-6 py-3 font-medium">Classe</th>
                                    <th className="px-6 py-3 font-medium">Score</th>
                                    <th className="px-6 py-3 font-medium">Temps</th>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredResults.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                                            Aucun résultat disponible pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResults
                                        .sort((a, b) => {
                                            const matA = parseInt(a.student.matricule) || 0;
                                            const matB = parseInt(b.student.matricule) || 0;
                                            return matA - matB;
                                        })
                                        .map((result, index) => {
                                            console.log(`Row ${index}:`, result.student); // Debug log
                                            return (
                                                <tr
                                                    key={index}
                                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                    onClick={() => navigate(`/admin/student/${result.timestamp}`)}
                                                >
                                                    <td className="px-6 py-4 font-bold text-gray-900">{result.student.matricule}</td>
                                                    <td className="px-6 py-4 font-medium text-gray-900">{result.student.grade}</td>
                                                    <td className="px-6 py-4 text-gray-900">{result.student.name}</td>
                                                    <td className="px-6 py-4 text-gray-600">{result.student.className}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${result.scoreOn20 >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {result.scoreOn20.toFixed(1)}/20
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                                        {Math.floor(result.timeElapsed / 60)}:{(result.timeElapsed % 60).toString().padStart(2, '0')}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-400 text-sm">
                                                        {new Date(result.timestamp).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;
