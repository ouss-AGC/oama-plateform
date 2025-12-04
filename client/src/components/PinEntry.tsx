import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';

const PinEntry: React.FC = () => {
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/validate-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin }),
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                // PIN is valid, proceed to registration
                navigate('/register');
            } else {
                setError(data.error || 'Code PIN invalide.');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4"
            style={{ backgroundImage: "url('/academy-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-black bg-opacity-70"></div>

            <div className="relative z-10 bg-white bg-opacity-95 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-300">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-military-green p-4 rounded-full mb-4 shadow-lg">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Accès Sécurisé</h2>
                    <p className="text-gray-600 text-sm mt-2">Veuillez entrer le code PIN de la session</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-4 text-center text-3xl font-bold text-gray-800 tracking-[0.5em] focus:outline-none focus:border-military-green transition-colors placeholder-gray-400"
                            maxLength={6}
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-center text-sm font-semibold bg-red-900 bg-opacity-30 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={pin.length !== 6 || loading}
                        className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center transition-all duration-300
                            ${pin.length === 6 && !loading
                                ? 'bg-military-beige text-military-green hover:bg-white shadow-lg transform hover:-translate-y-1'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {loading ? 'Vérification...' : 'Valider'}
                        {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PinEntry;
