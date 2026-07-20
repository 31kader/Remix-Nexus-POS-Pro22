import React from 'react';
import { Modal, Button } from '../ui';
import { AuditLog } from '../../types';
import { formatSafe } from '../../lib/utils';

interface EditLogModalProps {
  editingLog: AuditLog | null;
  setEditingLog: (log: AuditLog | null) => void;
  editUserName: string;
  setEditUserName: (v: string) => void;
  editModule: string;
  setEditModule: (v: string) => void;
  editAction: string;
  setEditAction: (v: string) => void;
  editDetails: string;
  setEditDetails: (v: string) => void;
  editSeverity: 'info' | 'warning' | 'high' | 'critical';
  setEditSeverity: (v: 'info' | 'warning' | 'high' | 'critical') => void;
  handleSaveEdit: () => void;
}

export function EditLogModal({
  editingLog,
  setEditingLog,
  editUserName,
  setEditUserName,
  editModule,
  setEditModule,
  editAction,
  setEditAction,
  editDetails,
  setEditDetails,
  editSeverity,
  setEditSeverity,
  handleSaveEdit
}: EditLogModalProps) {
  return (
    <Modal isOpen={!!editingLog} onClose={() => setEditingLog(null)} title="Modifier Entrée Journal">
      <div className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-1.5">Date original</label>
          <input 
            type="text" 
            disabled 
            value={editingLog ? formatSafe(editingLog.timestamp, 'dd/MM/yyyy HH:mm:s') : ''}
            className="w-full px-4 py-2.5 rounded-xl border border-industrial-700 bg-industrial-900/60 text-industrial-500 outline-none font-mono text-sm cursor-not-allowed" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-1.5">Utilisateur</label>
            <input 
              type="text" 
              value={editUserName}
              aria-label="Utilisateur"
              onChange={e => setEditUserName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-industrial-700 bg-industrial-900 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-semibold" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-1.5">Module</label>
            <input 
              type="text" 
              value={editModule}
              aria-label="Module"
              onChange={e => setEditModule(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-industrial-700 bg-industrial-900 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-semibold" 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-1.5">Action</label>
          <input 
            type="text" 
            value={editAction}
            aria-label="Action"
            onChange={e => setEditAction(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-industrial-700 bg-industrial-900 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-semibold" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-1.5 font-mono">Détails</label>
          <textarea 
            rows={3}
            value={editDetails}
            aria-label="Détails"
            onChange={e => setEditDetails(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-industrial-700 bg-industrial-900 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-mono" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-industrial-400 uppercase tracking-wider mb-1.5">Sévérité / Importance</label>
          <select
            value={editSeverity}
            aria-label="Sévérité"
            onChange={e => setEditSeverity(e.target.value as any)}
            className="w-full p-2.5 rounded-xl border border-industrial-700 bg-industrial-900 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
          >
            <option value="info">INFO</option>
            <option value="warning">WARNING</option>
            <option value="high">HIGH / ÉLEVÉ</option>
            <option value="critical">CRITICAL / CRITIQUE</option>
          </select>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button onClick={() => setEditingLog(null)} variant="secondary">Annuler</Button>
          <Button onClick={handleSaveEdit} variant="primary">Enregistrer</Button>
        </div>
      </div>
    </Modal>
  );
}
