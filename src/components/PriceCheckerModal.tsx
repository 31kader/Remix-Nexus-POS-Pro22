import React from 'react';
import { Product, CompanySettings, Category, Brand } from '../types';
import { usePriceCheckerLogic } from './price-checker/usePriceCheckerLogic';
import { PriceCheckerKioskView } from './price-checker/PriceCheckerKioskView';
import { PriceCheckerAdminView } from './price-checker/PriceCheckerAdminView';
import { PriceCheckerPinModal } from './price-checker/PriceCheckerPinModal';

interface PriceCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: CompanySettings;
  categories: Category[];
  brands: Brand[];
}

export function PriceCheckerModal({ isOpen, onClose, products, settings, categories, brands }: PriceCheckerModalProps) {
  const {
    isKioskMode,
    toggleKioskMode,
    searchTerm,
    setSearchTerm,
    foundProduct,
    notFoundCode,
    isScanning,
    setIsScanning,
    cameraError,
    facingMode,
    setFacingMode,
    remoteQueue,
    setRemoteQueue,
    autoQueueOnScan,
    setAutoQueueOnScan,
    labelQty,
    setLabelQty,
    showQueueDrawer,
    setShowQueueDrawer,
    currentTime,
    resetCountdown,
    showPinModal,
    setShowPinModal,
    enteredPin,
    setEnteredPin,
    pinError,
    pinDialogTimeout,
    inputRef,
    focusScannerInput,
    handleAttemptExit,
    verifyEnteredPin,
    handlePinDigitPress,
    handlePinBackspace,
    handleAddToRemoteQueue,
    handlePrintQueueNow,
    handleOpenInLabelStudio,
    executeProductLookup,
    totalLabelsInQueue
  } = usePriceCheckerLogic({ isOpen, onClose, products, settings });

  if (!isOpen) return null;

  if (isKioskMode) {
    return (
      <PriceCheckerKioskView
        inputRef={inputRef}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        focusScannerInput={focusScannerInput}
        handleAttemptExit={handleAttemptExit}
        foundProduct={foundProduct}
        notFoundCode={notFoundCode}
        isScanning={isScanning}
        setIsScanning={setIsScanning}
        facingMode={facingMode}
        setFacingMode={setFacingMode}
        cameraError={cameraError}
        settings={settings}
        resetCountdown={resetCountdown}
        handleAddToRemoteQueue={handleAddToRemoteQueue}
        showPinModal={showPinModal}
        setShowPinModal={setShowPinModal}
        enteredPin={enteredPin}
        setEnteredPin={setEnteredPin}
        pinError={pinError}
        handlePinDigitPress={handlePinDigitPress}
        handlePinBackspace={handlePinBackspace}
        toggleKioskMode={toggleKioskMode}
        pinDialogTimeout={pinDialogTimeout}
      />
    );
  }

  return (
    <>
      <PriceCheckerAdminView
        isOpen={isOpen}
        onClose={onClose}
        products={products}
        settings={settings}
        categories={categories}
        brands={brands}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        foundProduct={foundProduct}
        inputRef={inputRef}
        focusScannerInput={focusScannerInput}
        executeProductLookup={executeProductLookup}
        isScanning={isScanning}
        setIsScanning={setIsScanning}
        cameraError={cameraError}
        toggleKioskMode={toggleKioskMode}
        autoQueueOnScan={autoQueueOnScan}
        setAutoQueueOnScan={setAutoQueueOnScan}
        labelQty={labelQty}
        setLabelQty={setLabelQty}
        remoteQueue={remoteQueue}
        setRemoteQueue={setRemoteQueue}
        totalLabelsInQueue={totalLabelsInQueue}
        showQueueDrawer={showQueueDrawer}
        setShowQueueDrawer={setShowQueueDrawer}
        handleAddToRemoteQueue={handleAddToRemoteQueue}
        handlePrintQueueNow={handlePrintQueueNow}
        handleOpenInLabelStudio={handleOpenInLabelStudio}
      />

      <PriceCheckerPinModal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setEnteredPin('');
          focusScannerInput();
        }}
        enteredPin={enteredPin}
        pinError={pinError}
        pinDialogTimeout={pinDialogTimeout}
        handlePinDigitPress={handlePinDigitPress}
        handlePinBackspace={handlePinBackspace}
      />
    </>
  );
}

export default PriceCheckerModal;
