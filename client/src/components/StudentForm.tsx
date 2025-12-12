
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, FileText, Hash, Award, ChevronRight, Users } from 'lucide-react';

const StudentForm: React.FC = () => {
    const navigate = useNavigate();
    const [grade, setGrade] = useState('');
    const [fullName, setFullName] = useState('');
    const [classNameInput, setClassNameInput] = useState('');
    const [matricule, setMatricule] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const [discipline, setDiscipline] = useState('');

    useEffect(() => {
        const storedDiscipline = localStorage.getItem('selectedDiscipline');
        if (!storedDiscipline) {
            navigate('/');
        } else {
            setDiscipline(storedDiscipline);
        }
    }, [navigate]);

    // Generate class options based on discipline
    const getClassOptions = () => {
        if (discipline === 'munitions') {
            return Array.from({ length: 10 }, (_, i) => `LASM ${301 + i}`);
        } else if (discipline === 'explosions') {
            return ['GC 31'];
        } else {
            return Array.from({ length: 10 }, (_, i) => `LASM ${201 + i}`);
        }
    };

    // Generate matricule options
    const matriculeOptions = Array.from({ length: 32 }, (_, i) => (i + 1).toString());

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!grade) newErrors.grade = 'Veuillez sélectionner votre grade.';
        if (!fullName) newErrors.fullName = 'Veuillez entrer votre nom complet.';
        if (!classNameInput) newErrors.className = 'Veuillez entrer votre classe.';
        if (!matricule) newErrors.matricule = 'Veuillez entrer votre numéro matricule.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            const studentData = {
                grade,
                name: fullName,
                className: classNameInput,
                matricule
            };

            localStorage.setItem('studentInfo', JSON.stringify(studentData));

            // Join Session API Call
            try {
                await fetch('/api/join-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student: studentData }),
                });
            } catch (error) {
                console.error("Failed to join session:", error);
                // Proceed anyway locally if server fails, though ideally we should block
            }

            navigate('/waiting-room');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-12"
            style={{ backgroundImage: "url('/academy-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-black bg-opacity-70"></div>

            <div className="relative z-10 w-full max-w-2xl bg-white bg-opacity-95 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

                {/* Left Side - Decorative */}
                <div className="bg-military-green w-full md:w-1/3 p-8 flex flex-col items-center justify-center text-center">
                    <User className="w-16 h-16 text-white mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Inscription</h2>
                    <p className="text-military-beige text-sm">Veuillez remplir vos informations personnelles pour accéder au quiz.</p>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-2/3 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Grade */}
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center">
                                <Award className="w-4 h-4 mr-2 text-military-green" />
                                Grade
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                {['EOA', 'OEA'].map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setGrade(g)}
                                        className={`py-2 rounded-lg border-2 font-bold transition-colors
                                            ${grade === g
                                                ? 'bg-military-green text-white border-military-green'
                                                : 'bg-white text-gray-600 border-gray-300 hover:border-military-green'
                                            }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                            {errors.grade && <p className="text-red-500 text-xs mt-1">{errors.grade}</p>}
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center">
                                <User className="w-4 h-4 mr-2 text-military-green" />
                                Nom et Prénom
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-military-green transition-colors"
                                placeholder="Ex: Mohamed Ben Salah"
                            />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>

                        {/* Class */}
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center">
                                <Users className="w-4 h-4 mr-2 text-military-green" />
                                Classe
                            </label>
                            <select
                                value={classNameInput}
                                onChange={(e) => setClassNameInput(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-military-green transition-colors bg-white"
                            >
                                <option value="">Sélectionner une classe</option>
                                {getClassOptions().map((cls) => (
                                    <option key={cls} value={cls}>
                                        {cls}
                                    </option>
                                ))}
                            </select>
                            {errors.className && <p className="text-red-500 text-xs mt-1">{errors.className}</p>}
                        </div>

                        {/* Matricule */}
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-military-green" />
                                Numéro (Registre)
                            </label>
                            <select
                                value={matricule}
                                onChange={(e) => setMatricule(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-military-green transition-colors bg-white"
                            >
                                <option value="">Sélectionner un numéro</option>
                                {matriculeOptions.map((num) => (
                                    <option key={num} value={num}>
                                        {num}
                                    </option>
                                ))}
                            </select>
                            {errors.matricule && <p className="text-red-500 text-xs mt-1">{errors.matricule}</p>}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-military-green text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all transform hover:-translate-y-1 shadow-lg flex items-center justify-center"
                        >
                            Rejoindre la Salle d'Attente
                            <ChevronRight className="ml-2 w-5 h-5" />
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudentForm;
