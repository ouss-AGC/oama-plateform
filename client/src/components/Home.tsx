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
                {/* Admin Link */ }
                <div className="text-center">
                    <button
                        onClick={() => navigate('/admin/login')}
                        className="text-gray-500 hover:text-white text-sm flex items-center justify-center mx-auto transition-colors"
                    >
                        <Lock className="w-3 h-3 mr-1" />
                        Accès Administrateur
                    </button>
                </div>
                </div >

            </div >
        </div >
    );
};

export default Home;
