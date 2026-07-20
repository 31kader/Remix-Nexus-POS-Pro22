import React, { useState } from 'react';
import { Truck, Mail, Lock, EyeOff, Eye, AlertCircle } from 'lucide-react';
import { Supplier } from '../types';
import { Button } from './ui';
import { motion } from 'motion/react';



export function SupplierLogin({ onLogin }: { onLogin: (supplier: Supplier) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'suppliers', email: cleanEmail, password })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "Identifiants incorrects ou compte non activé.");
        return;
      }

      const supplierData = await response.json();

      if (!supplierData.isAppUser) {
        setError("Identifiants incorrects ou compte non activé.");
        return;
      }

      onLogin(supplierData);
    } catch (err) {
      console.error('Login error:', err);
      setError('Une erreur est survenue lors de la connexion.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-nardo flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <Truck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Portail Fournisseur</h1>
          <p className="text-slate-500">Connectez-vous pour gérer vos commandes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-rose-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Connexion..." : "Se connecter"}
          </Button>

          <div className="pt-4 border-t border-slate-100 text-center">
            <button 
              type="button"
              onClick={() => window.location.href = window.location.pathname}
              className="text-slate-500 text-sm font-medium hover:underline"
            >
              Retour à l'accueil du POS
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
