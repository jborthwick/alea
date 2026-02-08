import { HAND_NAMES } from '../../game/constants';
import type { HandRank } from '../../types/game';
import './UI.css';

const HAND_ORDER: HandRank[] = [
  'five-of-a-kind',
  'four-of-a-kind',
  'straight',
  'full-house',
  'three-of-a-kind',
  'two-pair',
  'one-pair',
];

export function PayoutTable() {
  return (
    <div className="payout-table">
      <h3>Hand Rankings</h3>
      {HAND_ORDER.map((hand) => (
        <div key={hand} className="payout-row">
          <span className="payout-hand">{HAND_NAMES[hand].replace('!', '')}</span>
        </div>
      ))}
      <div className="payout-info">Beat the opponent to win 2x your bet</div>
    </div>
  );
}
