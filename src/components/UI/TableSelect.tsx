import { useGameStore } from '../../store/gameStore';
import { TABLE_CONFIGS, TABLE_ORDER } from '../../game/constants';
import type { TableId } from '../../game/constants';
import './TableSelect.css';

export function TableSelect() {
  const bankroll = useGameStore((state) => state.bankroll);
  const selectTable = useGameStore((state) => state.selectTable);

  const handleSelect = (tableId: TableId) => {
    const config = TABLE_CONFIGS[tableId];
    if (config.bet > 0 && bankroll < config.bet) return;
    selectTable(tableId);
  };

  return (
    <div className="table-select">
      <div className="table-select-header">
        <h1 className="table-select-title">ALEA</h1>
        <div className="table-select-bankroll">
          <span className="table-select-bankroll-label">BANKROLL</span>
          <span className="table-select-bankroll-amount">${bankroll.toLocaleString()}</span>
        </div>
      </div>

      <div className="table-select-subtitle">SELECT A TABLE</div>

      <div className="table-select-grid">
        {TABLE_ORDER.map((tableId) => {
          const config = TABLE_CONFIGS[tableId];
          const canAfford = config.bet === 0 || bankroll >= config.bet;

          return (
            <button
              key={tableId}
              className={`table-card ${!canAfford ? 'table-card-disabled' : ''}`}
              onClick={() => handleSelect(tableId)}
              disabled={!canAfford}
              style={{
                '--card-accent': config.accent,
                '--card-accent-dark': config.accentDark,
              } as React.CSSProperties}
            >
              <div className="table-card-name">{config.name}</div>
              <div className="table-card-bet">
                {config.bet === 0 ? 'FREE' : `$${config.bet}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
