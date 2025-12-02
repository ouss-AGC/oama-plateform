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
    const [introStarted, setIntroStarted] = useState(false);

    const startExperience = () => {
        setIntroStarted(true);

        // Text-to-Speech Logic
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance("Welcome to the Military academy OAMA plateform, enjoy your evaluation test");
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1.1;

            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(v =>
                v.name.includes('Google US English') ||
                v.name.includes('Zira') ||
                v.name.includes('Female')
            );
            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }

            window.speechSynthesis.speak(utterance);
        }

        // Timer to hide intro after 15 seconds (duration of animation)
        setTimeout(() => {
            setShowIntro(false);
        }, 15000);
    };

    if (showIntro) {
        // Generate 40 layers for 3D thickness
        // Range -15px to +15px
        const layers = Array.from({ length: 40 }, (_, i) => {
            const z = -15 + (i * (30 / 39)); // Distribute from -15 to 15
            // Brightness gradient: darker at edges, lighter at center
            const brightness = 0.4 + (0.6 * (1 - Math.abs(z) / 15));
            return { z, brightness };
        });

        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black font-sans">

                {!introStarted && (
                    <div
                        onClick={startExperience}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-white cursor-pointer hover:bg-black/70 transition-colors"
                    >
                        <div className="text-4xl font-bold uppercase tracking-widest mb-4">Click to Start</div>
                        <div className="text-gray-400">(Turn up your volume)</div>
                    </div>
                )}

                <div className="scene">
                    {layers.map((layer, i) => (
                        <div
                            key={i}
                            className="coin-layer"
                            style={{
                                transform: `translateZ(${layer.z}px)`,
                                filter: `brightness(${layer.brightness})`
                            }}
                        >
                            <img src="/golden_stamp.png" alt="" className="coin-img" />
                            {/* Add shine to the front-most layer (approx index 39) and back-most? 
                                Actually, let's add it to the center-ish front-facing layer for effect.
                                Index 20 is center (0px). Let's put it on the very front (index 39) and very back (index 0)?
                                The preview had it on layer 21 (center). Let's stick to that.
                            */}
                            {i === 20 && <div className="shine"></div>}
                        </div>
                    ))}
                </div>

                <style>{`
                    .scene {
                        width: 85vh;
                        height: 85vh;
                        position: relative;
                        transform-style: preserve-3d;
                        animation: rotate-coin 15s linear infinite;
                    }
                    .coin-layer {
                        position: absolute;
                        top: 0; left: 0; width: 100%; height: 100%;
                        border-radius: 50%;
                        backface-visibility: visible;
                        background-color: #DAA520; /* Gold background */
                        border: 1px solid #B8860B; /* Gold border */
                    }
                    .coin-img {
                        width: 100%; height: 100%;
                        object-fit: cover;
                        border-radius: 50%;
                        transform: scale(1.05); /* Crop white edges */
                    }
                    .shine {
                        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                        border-radius: 50%;
                        background: linear-gradient(135deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 70%);
                        background-size: 200% 200%;
                        animation: shine-sweep 3s ease-in-out infinite;
                        pointer-events: none;
                        z-index: 10;
                    }
                    @keyframes shine-sweep {
                        0% { background-position: 200% 200%; }
                        100% { background-position: -100% -100%; }
                    }
                    @keyframes rotate-coin {
                        0% { transform: rotateY(0deg); }
                        100% { transform: rotateY(360deg); }
                    }
                `}</style>
            </div>
        );
    }

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
                <div className="absolute top-4 left-4 md:top-8 md:left-8 rounded-xl overflow-hidden shadow-lg bg-transparent">
                    <img src="/academy-logo.png" alt="Logo" className="w-20 md:w-24 h-auto object-contain" />
                </div>

                {/* Golden Stamp - Absolute Top Right with Bounce Animation */}
                <div className="absolute top-4 right-4 md:top-8 md:right-8 animate-bounce-custom rounded-full overflow-hidden shadow-xl bg-transparent">
                    <img src="/golden_stamp.png" alt="Golden Stamp" className="w-24 h-24 md:w-32 md:h-32 object-cover transform scale-105" />
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

                {/* Copyright Footer */}
                <div className="mt-auto py-4 text-center">
                    <p className="text-gray-500 text-xs md:text-sm font-medium tracking-wide">
                        © {new Date().getFullYear()} All copyrights reserved to <span className="text-military-beige">Assistant Professor Oussama Atoui</span>
                    </p>
                </div>

            </div>
        </div>
    );
};

export default Home;
