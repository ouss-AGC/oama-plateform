import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ChevronRight } from 'lucide-react';

const AdminLogin: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'AGC202508530118') {
            localStorage.setItem('adminAuthenticated', 'true');
            localStorage.setItem('adminSessionStart', Date.now().toString());
            navigate('/admin/dashboard');
        } else {
            setError('Mot de passe incorrect');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
                <div className="text-center mb-8">
                    <div className="bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-military-beige" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Accès Administrateur</h2>
                    <p className="text-gray-400 mt-2">Veuillez saisir le code d'accès sécurisé</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mot de passe"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-military-beige focus:ring-1 focus:ring-military-beige transition-colors"
                        />
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-military-beige text-military-green font-bold py-3 rounded-lg hover:bg-white transition-colors flex items-center justify-center"
                    >
                        Connexion
                        <ChevronRight className="ml-2 w-5 h-5" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="text-gray-500 hover:text-gray-300 text-sm"
                    >
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
