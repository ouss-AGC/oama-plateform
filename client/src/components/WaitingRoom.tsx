import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';

const WaitingRoom: React.FC = () => {
    const navigate = useNavigate();
    const [dots, setDots] = useState('');

    useEffect(() => {
        // Animation for dots
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Poll for quiz start status
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/quiz-status');
                const data = await response.json();
                if (data.started) {
                    // Get quiz mode from localStorage and navigate with appropriate URL
                    const quizMode = localStorage.getItem('quizMode');
                    const discipline = localStorage.getItem('selectedDiscipline');

                    if (quizMode === 'practice') {
                        navigate(`/quiz?discipline=${discipline}&mode=practice`);
                    } else {
                        navigate('/quiz');
                    }
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 2000); // Check every 2 seconds

        return () => clearInterval(pollInterval);
    }, [navigate]);

    const studentName = JSON.parse(localStorage.getItem('studentInfo') || '{}').fullName || 'Étudiant';

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4"
            style={{ backgroundImage: "url('/academy-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-black bg-opacity-80"></div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
                <div className="bg-military-green p-6 rounded-full mb-8 shadow-2xl animate-pulse">
                    <Clock className="w-16 h-16 text-white" />
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                    Salle d'Attente
                </h1>

                <p className="text-xl text-military-beige font-semibold mb-8">
                    Bienvenue, {studentName}
                </p>

                <div className="bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-xl border border-gray-600 w-full">
                    <p className="text-gray-300 text-lg mb-6">
                        L'administrateur lancera la session pour tous les participants simultanément.
                    </p>

                    <div className="flex items-center justify-center space-x-3 text-2xl font-bold text-white">
                        <span>En attente du démarrage</span>
                        <span className="w-8 text-left">{dots}</span>
                    </div>
                </div>

                <div className="mt-12 flex items-center text-gray-400 text-sm">
                    <Users className="w-4 h-4 mr-2" />
                    <span>Connexion sécurisée au serveur de l'Académie</span>
                </div>
            </div>
        </div>
    );
};

export default WaitingRoom;
