import { useState, useEffect } from 'react';
import { useGameStore, useStoreHydrated } from '../../store/gameStore';
import { PayoutTable } from './PayoutTable';
import './SettingsPanel.css';

type Screen = 'main' | 'howToPlay' | 'settings';

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
  const showDebugPanel = useGameStore((state) => state.showDebugPanel);
  const toggleDebugPanel = useGameStore((state) => state.toggleDebugPanel);
  const resetBankroll = useGameStore((state) => state.resetBankroll);
  const returnToLobby = useGameStore((state) => state.returnToLobby);

  const shakeActuallyEnabled = shakeEnabled && shakeSupported && shakePermission !== false;
  const showSoundEnabled = hydrated ? soundEnabled : false;
  const showShakeEnabled = hydrated ? shakeActuallyEnabled : false;
  const showDebugEnabled = hydrated ? showDebugPanel : false;
  const isDev = import.meta.env.DEV;

  const [screen, setScreen] = useState<Screen>('main');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Reset to main screen whenever panel opens
  useEffect(() => {
    if (isOpen) {
      setScreen('main');
      setShowResetConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwitchTables = () => {
    returnToLobby();
    onClose();
  };

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
        {/* === Main Menu === */}
        {screen === 'main' && (
          <>
            <div className="settings-header">
              <h2>ALEA</h2>
              <button className="settings-close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="settings-content">
              <button className="menu-item" onClick={handleSwitchTables}>
                <span>Switch Tables</span>
                <span className="menu-item-chevron">›</span>
              </button>
              <button className="menu-item" onClick={() => setScreen('howToPlay')}>
                <span>How to Play</span>
                <span className="menu-item-chevron">›</span>
              </button>
              <button className="menu-item" onClick={() => setScreen('settings')}>
                <span>Settings</span>
                <span className="menu-item-chevron">›</span>
              </button>
            </div>
          </>
        )}

        {/* === How to Play === */}
        {screen === 'howToPlay' && (
          <>
            <div className="settings-header">
              <button className="menu-back" onClick={() => setScreen('main')}>
                ←
              </button>
              <h2>How to Play</h2>
              <button className="settings-close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="settings-content">
              <p className="how-to-play-text">
                Roll five dice to build the best poker hand. Tap dice between rolls to hold them.
                Beat the opponent's hand to win.
              </p>
              <PayoutTable />
            </div>
          </>
        )}

        {/* === Settings === */}
        {screen === 'settings' && (
          <>
            <div className="settings-header">
              <button className="menu-back" onClick={() => setScreen('main')}>
                ←
              </button>
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

              {/* Shake toggle */}
              {shakeSupported && (
                <div className="settings-row">
                  <div className="settings-label-group">
                    <span className="settings-label">Shake to Roll</span>
                    {shakePermission === false && (
                      <span className="settings-label-hint">Permission denied</span>
                    )}
                  </div>
                  <button
                    className={`settings-toggle ${showShakeEnabled ? 'active' : ''}`}
                    onClick={async () => {
                      if (!shakeEnabled) {
                        if (shakePermission === null) {
                          await onRequestShakePermission();
                        }
                        toggleShake();
                      } else {
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

              {/* Debug panel toggle (dev builds only) */}
              {isDev && (
                <div className="settings-row">
                  <span className="settings-label">Debug Panel</span>
                  <button
                    className={`settings-toggle ${showDebugEnabled ? 'active' : ''}`}
                    onClick={toggleDebugPanel}
                    disabled={!hydrated}
                    aria-label={showDebugEnabled ? 'Hide debug panel' : 'Show debug panel'}
                  >
                    <span className="toggle-track">
                      <span className="toggle-thumb" />
                    </span>
                  </button>
                </div>
              )}

              <div className="settings-divider" />

              <button className="settings-reset-button" onClick={handleResetClick}>
                Reset Score
              </button>
            </div>
          </>
        )}
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
