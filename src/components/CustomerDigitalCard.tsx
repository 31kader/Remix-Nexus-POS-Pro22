import React from 'react';
import { Award, Printer, MessageSquare } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from './ui';
import { CompanySettings, Customer } from '../types';

interface CustomerDigitalCardProps {
  selectedCustomer: Customer;
  settings: CompanySettings;
}

export function CustomerDigitalCard({ selectedCustomer, settings }: CustomerDigitalCardProps) {
  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-6">
      <div id={`loyalty-card-export-${selectedCustomer.id}`} className="w-full space-y-6 bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl relative">
        <div id="loyalty-card-preview" className="w-full aspect-[1.586/1] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden transition-transform hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full -ml-16 -mb-16 blur-xl" />
          
          <div className="relative h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-black tracking-tight">{settings.name}</h4>
                <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mt-0.5">Membre Privilège</p>
              </div>
              <Award size={28} className="text-amber-400 drop-shadow-md" />
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-indigo-300 uppercase tracking-wider font-bold">Titulaire</p>
              <p className="text-2xl font-black tracking-wide truncate">{selectedCustomer.name}</p>
            </div>
            
            <div className="flex justify-between items-end">
              <div className="font-mono text-sm tracking-widest text-indigo-100 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                {selectedCustomer.loyaltyCardNumber || 'XXXX XXXX XXXX'}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Points</p>
                <p className="text-3xl font-black text-amber-400 leading-none drop-shadow-sm">{selectedCustomer.loyaltyPoints}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="w-full p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center gap-3 shadow-sm">
          <div className="p-4 bg-white rounded-xl border-2 border-slate-100">
            <QRCodeCanvas 
              id={`qr-loyalty-${selectedCustomer.id}`}
              value={selectedCustomer.loyaltyCardNumber || selectedCustomer.id} 
              size={140}
              level="Q"
              includeMargin={false}
            />
          </div>
          <p className="text-xs text-slate-500 font-medium text-center">
            Code pour le scan en caisse<br/>
            <span className="font-mono font-bold text-slate-800 mt-1 block">{selectedCustomer.loyaltyCardNumber || selectedCustomer.id}</span>
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 w-full">
        <Button variant="secondary" className="gap-2 font-bold py-4" onClick={() => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;
          const canvas = document.getElementById(`qr-loyalty-${selectedCustomer.id}`) as HTMLCanvasElement;
          const qrImageData = canvas ? canvas.toDataURL() : '';
          
          const cardHtml = `
            <html>
              <head>
                <title>Carte Fidélité - ${selectedCustomer.name}</title>
                <style>
                  @page { size: auto; margin: 0; }
                  body { font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
                  .card { 
                    width: 350px; 
                    height: 200px; 
                    background: linear-gradient(135deg, #4f46e5, #7c3aed); 
                    border-radius: 16px; 
                    padding: 24px; 
                    color: white; 
                    position: relative;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                  }
                  .qr-section { 
                    background: white; 
                    padding: 8px; 
                    border-radius: 12px; 
                    width: 80px; 
                    height: 80px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #e2e8f0;
                  }
                  .qr-section img { width: 100%; height: 100%; }
                  .name { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
                  .points-badge { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                  .points-val { color: #fbbf24; font-size: 20px; font-weight: 900; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                      <div style="font-size: 16px; font-weight: 800;">${settings.name}</div>
                      <div style="font-size: 9px; opacity: 0.8; letter-spacing: 1px; margin-top: 2px;">CARTE FIDÉLITÉ</div>
                    </div>
                    <div class="qr-section">
                      <img src="${qrImageData}" />
                    </div>
                  </div>
                  
                  <div style="margin-top: 10px;">
                    <div style="font-size: 9px; opacity: 0.8; margin-bottom: 2px;">TITULAIRE</div>
                    <div class="name">${selectedCustomer.name}</div>
                    <div style="font-family: monospace; font-size: 12px; letter-spacing: 2px; opacity: 0.9; margin-top: 4px;">
                      ${selectedCustomer.loyaltyCardNumber || '#### #### #### ####'}
                    </div>
                  </div>
                  
                  <div style="position: absolute; bottom: 24px; right: 24px; text-align: right;">
                    <div style="font-size: 9px; opacity: 0.8;">POINTS</div>
                    <div class="points-val">${selectedCustomer.loyaltyPoints}</div>
                  </div>
                </div>
                <script>
                  window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
                </script>
              </body>
            </html>
          `;
          printWindow.document.write(cardHtml);
          printWindow.document.close();
        }}>
          <Printer size={18} /> Imprimer
        </Button>
        <Button variant="outline" className="gap-2 border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold hover:bg-emerald-500 hover:text-white py-4 transition-colors" onClick={async () => {
          const exportEl = document.getElementById(`loyalty-card-export-${selectedCustomer.id}`);
          if (!exportEl) {
            const message = encodeURIComponent(`Bonjour ${selectedCustomer.name}, voici votre carte de fidélité ${settings.name}.\n\nNuméro de Carte: ${selectedCustomer.loyaltyCardNumber || selectedCustomer.id}\nSolde de Points: ${selectedCustomer.loyaltyPoints} pts\n\nMerci de votre fidélité !`);
            window.open(`https://wa.me/${selectedCustomer.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
            return;
          }
          
          try {
            const { toBlob } = await import('html-to-image');
            const blob = await toBlob(exportEl, {
              pixelRatio: 2,
              backgroundColor: '#0f172a',
            });
            
            if (!blob) return;
            
            const message = `Bonjour ${selectedCustomer.name}, voici votre carte de fidélité ${settings.name}.\n\nSolde de Points: ${selectedCustomer.loyaltyPoints} pts\n\nMerci de votre fidélité !`;
            
            const link = document.createElement('a');
            link.download = `carte_fidelite_${selectedCustomer.id}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            
            setTimeout(() => {
              window.location.href = `https://wa.me/${selectedCustomer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message + " (N'oubliez pas de joindre l'image téléchargée !)")}`;
            }, 500);
            
          } catch(e) {
            console.error('Erreur html-to-image', e);
          }
        }}>
          <MessageSquare size={18} /> WhatsApp
        </Button>
      </div>
    </div>
  );
}
