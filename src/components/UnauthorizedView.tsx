import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card, Button } from './ui';

interface UnauthorizedViewProps {
  user: any;
  profile: any;
  isOwner: boolean;
  handleLogout: () => void;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  user,
  profile,
  isOwner,
  handleLogout
}) => {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full p-8 text-center flex flex-col items-center gap-6">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accès Refusé</h1>
          <div className="text-slate-500 mt-2 space-y-2">
            <p>Votre compte <span className="font-bold text-indigo-600">{user?.email || profile?.email || 'N/A'}</span> n'est pas autorisé à accéder à cette application.</p>
            {isOwner && <p className="text-amber-600 font-bold">ATTENTION: Vous êtes identifié comme propriétaire mais l'accès est encore restreint. Raffraichissez la page.</p>}
            <p className="text-sm">
              L'administrateur doit vous ajouter dans la section <b>"Personnel & Accès"</b> avec cette adresse email exacte pour vous donner accès.
            </p>
            <p className="text-[10px] text-slate-400 mt-4 font-mono">UID: {user?.uid || 'none'}</p>
          </div>
        </div>
        <div className="w-full flex gap-2">
          <Button onClick={handleLogout} variant="outline" className="flex-1 py-4 text-sm font-bold hover:bg-slate-50 border-2">
            Déconnexion
          </Button>
          <Button onClick={() => window.location.reload()} className="flex-1 py-4 text-sm font-bold shadow-lg shadow-indigo-100">
            Rafraîchir
          </Button>
        </div>
      </Card>
    </div>
  );
};
