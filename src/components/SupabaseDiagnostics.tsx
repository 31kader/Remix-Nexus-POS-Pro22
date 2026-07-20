import React from 'react';
import { useSupabaseDiagnosticsLogic } from './useSupabaseDiagnosticsLogic';
import { DiagnosticWarningPanel } from './diagnostics/DiagnosticWarningPanel';
import { DiagnosticHeader } from './diagnostics/DiagnosticHeader';
import { DiagnosticActionBoxes } from './diagnostics/DiagnosticActionBoxes';
import { DiagnosticTableInspection } from './diagnostics/DiagnosticTableInspection';
import { DiagnosticSQLGuides } from './diagnostics/DiagnosticSQLGuides';

export const SupabaseDiagnostics: React.FC = () => {
  const {
    tables,
    activeSection,
    setActiveSection,
    isSyncing,
    isInsertingDemo,
    isCleaning,
    sqlCreateTables,
    sqlDropTables,
    anyError,
    missingTables,
    handleCleanupAIStudioFiles,
    runDiagnostics,
    handleCopy,
    handleSyncNow,
    insertDemoData,
    sqlMigrationTables,
    sqlDisableRLS,
    sqlEnableRLSPublic
  } = useSupabaseDiagnosticsLogic();

  return (
    <div className="space-y-6">
      {/* 0. Critical Setup Warning */}
      <DiagnosticWarningPanel
        missingTables={missingTables}
        sqlCreateTables={sqlCreateTables}
        handleCopy={handleCopy}
      />

      {/* 1. Header Overview */}
      <DiagnosticHeader
        runDiagnostics={runDiagnostics}
        handleSyncNow={handleSyncNow}
        isSyncing={isSyncing}
        tablesLoading={tables.some(t => t.loading)}
      />

      {/* 2. Interactive action boxes for database sync and demo creation */}
      <DiagnosticActionBoxes
        insertDemoData={insertDemoData}
        isInsertingDemo={isInsertingDemo}
        handleSyncNow={handleSyncNow}
        isSyncing={isSyncing}
        handleCleanupAIStudioFiles={handleCleanupAIStudioFiles}
        isCleaning={isCleaning}
      />

      {/* 3. Table Inspection List */}
      <DiagnosticTableInspection
        tables={tables}
        anyError={anyError}
      />

      {/* 4. Troubleshooting expandable console */}
      <DiagnosticSQLGuides
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sqlCreateTables={sqlCreateTables}
        sqlMigrationTables={sqlMigrationTables}
        sqlDisableRLS={sqlDisableRLS}
        sqlEnableRLSPublic={sqlEnableRLSPublic}
        sqlDropTables={sqlDropTables}
        handleCopy={handleCopy}
      />
    </div>
  );
};
