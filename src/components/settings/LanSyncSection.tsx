import React, { useState, useEffect } from 'react';
import { Network } from 'lucide-react';
import { useLanSyncStatus } from '../../hooks/useLanSyncStatus';
import { getTerminalId, getTerminalName, setTerminalInfo } from '../../services/terminalService';
import { LanRole } from '../../types/lanSync';
import { toast } from 'sonner';
import { LanTerminalIdentifier } from './lan-sync/LanTerminalIdentifier';
import { LanRoleSelector } from './lan-sync/LanRoleSelector';
import { LanMasterConfigView } from './lan-sync/LanMasterConfigView';
import { LanSecondaryConfigView } from './lan-sync/LanSecondaryConfigView';
import { LanHybridScenariosGuide } from './lan-sync/LanHybridScenariosGuide';

export function LanSyncSection() {
  const { 
    role, 
    masterIp, 
    masterPort, 
    lanToken, 
    isLanConnected, 
    connectedPeers, 
    latencyMs, 
    setRole, 
    setMasterIp, 
    setMasterPort, 
    setLanToken, 
    testConnection
  } = useLanSyncStatus();

  const [selectedRole, setSelectedRole] = useState<LanRole>(role);
  const [inputMasterIp, setInputMasterIp] = useState<string>(masterIp);
  const [inputMasterPort, setInputMasterPort] = useState<number>(masterPort);
  const [inputLanToken, setInputLanToken] = useState<string>(lanToken);
  const [terminalId, setLocalTerminalId] = useState<string>(getTerminalId());
  const [terminalName, setLocalTerminalName] = useState<string>(getTerminalName());

  const [detectedIps, setDetectedIps] = useState<Array<{ name: string; ip: string }>>([]);
  const [primaryDetectedIp, setPrimaryDetectedIp] = useState<string>('localhost');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; latency?: number } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    setSelectedRole(role);
    setInputMasterIp(masterIp);
    setInputMasterPort(masterPort);
    setInputLanToken(lanToken);
  }, [role, masterIp, masterPort, lanToken]);

  // Récupération des adresses IP locales réelles du PC (Ethernet & Wi-Fi)
  useEffect(() => {
    fetch('/api/network-ip')
      .then(res => res.json())
      .then(data => {
        if (data?.ip) {
          setPrimaryDetectedIp(data.ip);
        }
        if (Array.isArray(data?.allIps)) {
          setDetectedIps(data.allIps);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveConfiguration = () => {
    setTerminalInfo(terminalId, terminalName);
    setRole(selectedRole);
    setMasterIp(inputMasterIp);
    setMasterPort(inputMasterPort);
    setLanToken(inputLanToken);
    toast.success('Configuration réseau local enregistrée !');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(inputMasterIp, inputMasterPort);
      setTestResult({
        success: res.success,
        message: res.message,
        latency: res.latencyMs
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Erreur inconnue'
      });
      toast.error('Échec du test de connexion');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyMasterAddress = () => {
    const text = `${primaryDetectedIp}:${inputMasterPort}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success(`Adresse ${text} copiée dans le presse-papier !`);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 text-left">
      {/* 1. Identification de la Caisse */}
      <LanTerminalIdentifier
        terminalId={terminalId}
        onTerminalIdChange={setLocalTerminalId}
        terminalName={terminalName}
        onTerminalNameChange={setLocalTerminalName}
        onSave={handleSaveConfiguration}
      />

      {/* 2. Sélection du Rôle Réseau Local */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Network size={18} className="text-indigo-500" />
            Mode de Fonctionnement Réseau Local (LAN Multi-Caisses)
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
            Synchronisation en direct sans Internet via câble Ethernet ou Wi-Fi entre les caisses d'un même magasin
          </p>
        </div>

        {/* 3 Cartes de sélection de rôle */}
        <LanRoleSelector
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
        />

        {/* Détails Caisse Maître */}
        {selectedRole === 'MASTER' && (
          <LanMasterConfigView
            primaryDetectedIp={primaryDetectedIp}
            inputMasterPort={inputMasterPort}
            detectedIps={detectedIps}
            isCopied={isCopied}
            onCopyMasterAddress={handleCopyMasterAddress}
            connectedPeers={connectedPeers}
          />
        )}

        {/* Détails Caisse Secondaire */}
        {selectedRole === 'SECONDARY' && (
          <LanSecondaryConfigView
            inputMasterIp={inputMasterIp}
            onMasterIpChange={setInputMasterIp}
            inputMasterPort={inputMasterPort}
            onMasterPortChange={setInputMasterPort}
            onTestConnection={handleTestConnection}
            isTesting={isTesting}
            isLanConnected={isLanConnected}
            latencyMs={latencyMs}
            testResult={testResult}
          />
        )}
      </div>

      {/* 3. Schéma Explicatif des 4 Situations Hybrides */}
      <LanHybridScenariosGuide />
    </div>
  );
}
