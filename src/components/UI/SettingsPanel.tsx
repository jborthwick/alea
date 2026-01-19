import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const shakeEnabled = useGameStore((state) => state.shakeEnabled);
  const toggleShake = useGameStore((state) => state.toggleShake);
  const resetBankroll = useGameStore((state) => state.resetBankroll);

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
              className={`settings-toggle ${soundEnabled ? 'active' : ''}`}
              onClick={toggleSound}
              aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </button>
          </div>

          {/* Shake toggle */}
          <div className="settings-row">
            <span className="settings-label">Shake to Roll</span>
            <button
              className={`settings-toggle ${shakeEnabled ? 'active' : ''}`}
              onClick={toggleShake}
              aria-label={shakeEnabled ? 'Disable shake to roll' : 'Enable shake to roll'}
            >
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </button>
          </div>

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
