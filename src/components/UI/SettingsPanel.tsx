import { useState } from 'react';
import { useGameStore, useStoreHydrated } from '../../store/gameStore';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  shakeSupported: boolean;
  shakePermission: boolean | null;
  onRequestShakePermission: () => Promise<void>;
}

export function SettingsPanel({
  isOpen,
  onClose,
  shakeSupported,
  shakePermission,
  onRequestShakePermission,
}: SettingsPanelProps) {
  const hydrated = useStoreHydrated();
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const shakeEnabled = useGameStore((state) => state.shakeEnabled);
  const toggleShake = useGameStore((state) => state.toggleShake);
  const resetBankroll = useGameStore((state) => state.resetBankroll);

  // Shake is only truly enabled if user wants it AND we have permission (or don't need it)
  const shakeActuallyEnabled = shakeEnabled && shakeSupported && shakePermission !== false;

  // Don't show incorrect state while loading from localStorage
  const showSoundEnabled = hydrated ? soundEnabled : false;
  const showShakeEnabled = hydrated ? shakeActuallyEnabled : false;

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    resetBankroll();
    setShowResetConfirm(false);
    onClose();
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="settings-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-content">
          {/* Sound toggle */}
          <div className="settings-row">
            <span className="settings-label">Sound</span>
            <button
              className={`settings-toggle ${showSoundEnabled ? 'active' : ''}`}
              onClick={toggleSound}
              disabled={!hydrated}
              aria-label={showSoundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </button>
          </div>

          {/* Shake toggle - only show if device supports it */}
          {shakeSupported && (
            <div className="settings-row">
              <div className="settings-label-group">
                <span className="settings-label">Shake to Roll</span>
                {shakePermission === null && shakeEnabled && (
                  <span className="settings-label-hint">Tap toggle to activate</span>
                )}
                {shakePermission === false && (
                  <span className="settings-label-hint">Permission denied</span>
                )}
              </div>
              <button
                className={`settings-toggle ${showShakeEnabled ? 'active' : ''}`}
                onClick={async () => {
                  // On iOS, permission resets on page reload, so always try to get it
                  // when enabling or re-enabling shake
                  if (!shakeEnabled || shakePermission === null) {
                    // Request permission if we don't have it yet
                    if (shakePermission === null) {
                      await onRequestShakePermission();
                    }
                    // Only toggle on if not already enabled
                    if (!shakeEnabled) {
                      toggleShake();
                    }
                  } else {
                    // Turning off
                    toggleShake();
                  }
                }}
                disabled={!hydrated}
                aria-label={showShakeEnabled ? 'Disable shake to roll' : 'Enable shake to roll'}
              >
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="settings-divider" />

          {/* Reset button */}
          <button className="settings-reset-button" onClick={handleResetClick}>
            Reset Score
          </button>
        </div>
      </div>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <>
          <div className="modal-backdrop" onClick={handleCancelReset} />
          <div className="confirm-modal">
            <h3>Reset Score?</h3>
            <p>This will reset your bankroll to $1,000. This cannot be undone.</p>
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={handleCancelReset}>
                Cancel
              </button>
              <button className="modal-confirm" onClick={handleConfirmReset}>
                Reset
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
