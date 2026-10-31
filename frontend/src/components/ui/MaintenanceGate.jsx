import React, { useState } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { MaintenanceScreen } from './MaintenanceScreen';
import { StoreClosedOverlay } from './StoreClosedOverlay';
import { StoreClosedBanner } from './StoreClosedBanner';
import { Outlet } from 'react-router-dom';

export function MaintenanceGate() {
  const { loading, isStoreClosed, isMaintenanceMode } = useConfig();
  const [isOverlayOpen, setIsOverlayOpen] = useState(() => {
    try {
      return sessionStorage.getItem('akula_store_closed_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  // While public settings load (first visit only — they are cached afterwards), render the
  // storefront straight away so the page shell, skeletons and data requests start in
  // parallel. A full-screen spinner here used to hold back every page, including the
  // homepage code itself, until settings AND categories had both arrived. Maintenance is
  // also enforced by the backend; this gate only decides what to display.
  if (loading) {
    return <Outlet />;
  }

  // Hard technical maintenance mode
  if (isMaintenanceMode) {
    return <MaintenanceScreen />;
  }

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
    try {
      sessionStorage.setItem('akula_store_closed_dismissed', 'true');
    } catch {}
  };

  return (
    <>
      {isStoreClosed && (
        <>
          <StoreClosedBanner onShowDetails={() => setIsOverlayOpen(true)} />
          <StoreClosedOverlay isOpen={isOverlayOpen} onClose={handleCloseOverlay} />
        </>
      )}
      <Outlet />
    </>
  );
}
