import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Target, Flame, ChevronRight, Lock } from 'lucide-react';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);

    const disciplines = [
        {
            id: 'munitions',
            title: 'Generalites sur les Munitions LASM 3',
            icon: <Target className="w-8 h-8" />,
            description: 'Types de munitions, caractéristiques et sécurité.',
            color: 'bg-military-green'
        },
        {
            id: 'agc',
            title: 'Armement Gros Calibre (AGC) pour LASM 2',
            icon: <Shield className="w-8 h-8" />,
            description: 'Systèmes d\'armes, M777, CAESAR et procédures.',
            color: 'bg-military-gray'
        },
        {
            id: 'genie',
            title: 'Genie Militaire 4 LASM 2',
            icon: <Flame className="w-8 h-8" />,
            description: 'Explosifs, détonateurs et déminage.',
            color: 'bg-yellow-600'
        }
    ];

    const handleStart = () => {
        if (selectedDiscipline) {
            localStorage.setItem('selectedDiscipline', selectedDiscipline);
            navigate('/pin');
        }
    };

    const [showIntro, setShowIntro] = useState(true);

    React.useEffect(() => {
        // Timer to hide intro after 5 seconds
        const timer = setTimeout(() => {
            setShowIntro(false);
        }, 5000);

        // Text-to-Speech Logic
        const speakIntro = () => {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance("Welcome to the Military academy OAMA plateform, enjoy your QUIZ");
                utterance.lang = 'en-US';
                utterance.rate = 0.9; // Slightly slower for clarity
                utterance.pitch = 1.1; // Slightly higher pitch for a more feminine tone

                // Try to select a female voice
                const voices = window.speechSynthesis.getVoices();
                const femaleVoice = voices.find(v =>
                    v.name.includes('Female') ||
                    v.name.includes('Zira') ||
                    v.name.includes('Google US English')
                );
                if (femaleVoice) {
                    utterance.voice = femaleVoice;
                }

                window.speechSynthesis.speak(utterance);
            }
        };

        // Attempt to speak immediately (might be blocked by browser autoplay policy)
        // We add a small delay to ensure voices are loaded
        setTimeout(() => {
            speakIntro();
        }, 500);
        return (
            <div className="min-h-screen relative bg-gray-900 overflow-hidden flex flex-col">

                {/* Background Image with 80% Transparency (Opacity 0.2) */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
                    style={{
                        backgroundImage: "url('/academy-bg.jpg')",
                        opacity: 0.2
                    }}
                ></div>

                {/* Content Container */}
                <div className="relative z-10 flex flex-col h-full w-full max-w-7xl mx-auto px-4 py-6">

                    {/* Logo - Absolute Top Left */}
                    <div className="absolute top-4 left-4 md:top-8 md:left-8">
                        <img src="/academy-logo.png" alt="Logo" className="w-20 md:w-24 h-auto drop-shadow-lg" />
                    </div>

                    {/* Golden Stamp - Absolute Top Right with Bounce Animation */}
                    <div className="absolute top-4 right-4 md:top-8 md:right-8 animate-bounce-custom">
                        <img src="/golden_stamp.png" alt="Golden Stamp" className="w-24 h-24 md:w-32 md:h-32 drop-shadow-xl" />
                    </div>

                    <style>{`
                    @keyframes bounce-custom {
                        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                        40% { transform: translateY(-20px); }
                        60% { transform: translateY(-10px); }
                    }
                    .animate-bounce-custom {
                        animation: bounce-custom 3s infinite;
                    }
                `}</style>

                    {/* Header - Top Center */}
                    <div className="flex flex-col items-center mt-4 md:mt-8 mb-auto w-full">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-wider uppercase text-center drop-shadow-2xl">
                            OAMA-Plateform
                        </h1>
                    </div>

                    {/* Discipline Selector - Bottom */}
                    <div className="w-full max-w-5xl mx-auto mt-12 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {disciplines.map((disc) => (
                                <button
                                    key={disc.id}
                                    onClick={() => setSelectedDiscipline(disc.id)}
                                    className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center backdrop-blur-md
                  ${selectedDiscipline === disc.id
                                            ? 'bg-military-green/90 border-military-beige scale-105 shadow-2xl'
                                            : 'bg-gray-800/60 border-gray-600 hover:bg-gray-700/80 text-gray-300'
                                        }`}
                                >
                                    <div className={`p-3 rounded-full mb-4 ${selectedDiscipline === disc.id ? 'bg-white text-military-green' : 'bg-gray-700'}`}>
                                        {disc.icon}
                                    </div>
                                    <h3 className={`text-lg font-bold mb-2 ${selectedDiscipline === disc.id ? 'text-white' : 'text-white'}`}>
                                        {disc.title}
                                    </h3>
                                    <p className={`text-sm ${selectedDiscipline === disc.id ? 'text-gray-100' : 'text-gray-400'}`}>
                                        {disc.description}
                                    </p>
                                </button>
                            ))}
                        </div>

                        {/* Action Button */}
                        <div className="text-center mb-6">
                            <button
                                onClick={handleStart}
                                disabled={!selectedDiscipline}
                                className={`px-10 py-4 rounded-full font-bold text-lg flex items-center mx-auto transition-all duration-300 shadow-xl
                ${selectedDiscipline
                                        ? 'bg-military-beige text-military-green hover:bg-white hover:scale-105 cursor-pointer'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                Commencer le Quiz
                                <ChevronRight className="ml-2 w-6 h-6" />
                            </button>
                        </div>

                        {/* Admin Link */}
                        <div className="text-center">
                            <button
                                onClick={() => navigate('/admin/login')}
                                className="text-gray-500 hover:text-white text-sm flex items-center justify-center mx-auto transition-colors"
                            >
                                <Lock className="w-3 h-3 mr-1" />
                                Accès Administrateur
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        );
    };

    export default Home;
