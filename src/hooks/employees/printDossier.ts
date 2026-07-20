import { Employee, CompanySettings } from '../../types';

export function handlePrintDossier(employee: Employee, settings: CompanySettings) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres contextuelles pour imprimer le dossier.");
    return;
  }
  const contractText = `CONTRAT DE TRAVAIL INDIVIDUEL (NEXUS POS PRO)

Entre l'employeur : ${settings.name || 'NEXUS AUTOMATION SAS'}
Et le salarié : ${employee.name ? employee.name.toUpperCase() : 'SALARIÉ'}

1. FONCTIONS ET ATTRIBUTIONS :
Le salarié est recruté en qualité de : ${employee.role?.toUpperCase() || 'COLLABORATEUR'}.

2. DATE D'ENTRÉE :
Le présent contrat prend effet à compter du : ${employee.hireDate || 'N/A'} pour une durée indéterminée.

3. SÉCURITÉ & CONNEXION :
Le salarié s'engage à respecter scrupuleusement la confidentialité des codes d'accès Nexus POS Pro générés au point de vente.

4. RÉMUNÉRATION :
Le type de rémunération convenu est : ${
    employee.salaryType === 'hourly' ? "TAUX HORAIRE" :
    employee.salaryType === 'daily' ? "TAUX JOURNALIER" : "MENSUEL FIXE"
  }.
La base de rémunération brute est fixée à : ${
    employee.salaryType === 'hourly' ? employee.hourlyRate :
    employee.salaryType === 'daily' ? employee.dailyRate : employee.baseSalary
  } ${settings.currency || 'DA'}.

Fait de manière numérique de plein accord des deux parties.`;

  printWindow.document.write(`
    <html>
      <head>
        <title>Dossier Employé - ${employee.name.toUpperCase()}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 10px; color: #111; line-height: 1.6; }
          .badge { display: inline-block; padding: 4px 10px; background: #e0e7ff; color: #4338ca; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; }
          .header-title { font-size: 24px; font-weight: 950; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 30px; }
          .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 30px 0 15px 0; }
          .grid-docs { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-top: 20px; }
          .doc-box { border: 1px solid #eee; padding: 15px; text-align: center; background: #fafafa; border-radius: 12px; }
          .doc-box p { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #666; margin-top: 0; margin-bottom: 10px; }
          .doc-img { max-height: 200px; max-width: 100%; object-fit: contain; border-radius: 8px; border: 1px solid #ddd; background: #eee; }
          .contract-paper { font-family: monospace; white-space: pre-wrap; font-size: 11px; background: #fdfdfd; padding: 25px; border-left: 3px solid #6366f1; border-radius: 4px; border: 1px solid #eee; }
          .sig-grid { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; }
          .sig-box { border-top: 1px solid #aaa; width: 45%; text-align: center; font-size: 11px; text-transform: uppercase; padding-top: 10px; }
          .sig-img { max-height: 60px; object-fit: contain; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="badge">Dossier Numérique Certifié</div>
        <h1 class="header-title">Nexus Staff dossier : ${employee.name.toUpperCase()}</h1>
        
        <div class="section-title">Contrat de Travail Numérique</div>
        <div class="contract-paper">${contractText}</div>

        <div class="sig-grid">
          <div class="sig-box">
            <p>Signature de l'Employeur</p>
            <p style="font-style: italic; font-size: 12px; height: 40px; color: #777; display: flex; align-items: center; justify-content: center;">[Paraphe Électronique]</p>
          </div>
          <div class="sig-box">
            <p>Signature du Salarié</p>
            ${employee.digitalSignatureUrl ? `<img class="sig-img" src="${employee.digitalSignatureUrl}" />` : '<div style="height: 40px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px;">[NON SIGNÉ ENCORE]</div>'}
          </div>
        </div>

        <div class="section-title">Pièces Justificatives d'Identité</div>
        <div class="grid-docs">
          <div class="doc-box">
            <p>Pièce d'Identité (Recto)</p>
            ${employee.idCardRectoUrl ? `<img class="doc-img" src="${employee.idCardRectoUrl}" />` : '<div style="height: 120px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999; border: 1px dashed #ccc; border-radius: 6px;">Image Non Fournie</div>'}
          </div>
          <div class="doc-box">
            <p>Pièce d'Identité (Verso)</p>
            ${employee.idCardVersoUrl ? `<img class="doc-img" src="${employee.idCardVersoUrl}" />` : '<div style="height: 120px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999; border: 1px dashed #ccc; border-radius: 6px;">Image Non Fournie</div>'}
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
