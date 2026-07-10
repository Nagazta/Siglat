import { useState, useCallback } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { confirmOutage, voteRestored } from "../../services/reports";

const STORAGE_KEY = "powerwatch_votes";

function getVotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveVote(reportId, type) {
  const votes = getVotes();
  votes[reportId] = type; // "confirmed" | "restored"
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
}

/**
 * Community confirmation buttons for a report.
 * Uses optimistic UI — count updates instantly, then calls the service.
 * localStorage prevents double-voting across page reloads.
 *
 * @param {string} reportId
 * @param {number} confirmations  - Current confirmation count
 * @param {number} restoredVotes  - Current restore vote count
 * @param {Function} onUpdate     - Called with { confirmations, restoredVotes } after a vote
 */
export default function ConfirmButton({ reportId, confirmations = 0, restoredVotes = 0, onUpdate }) {
  const existingVote = getVotes()[reportId] || null;

  const [counts, setCounts] = useState({ confirmations, restoredVotes });
  const [voted, setVoted] = useState(existingVote); // "confirmed" | "restored" | null
  const [busy, setBusy] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (voted || busy) return;
    setBusy(true);
    const next = { ...counts, confirmations: counts.confirmations + 1 };
    setCounts(next);
    setVoted("confirmed");
    saveVote(reportId, "confirmed");
    onUpdate?.(next);
    await confirmOutage(reportId).catch(() => {});
    setBusy(false);
  }, [voted, busy, counts, reportId, onUpdate]);

  const handleRestored = useCallback(async () => {
    if (voted || busy) return;
    setBusy(true);
    const next = { ...counts, restoredVotes: counts.restoredVotes + 1 };
    setCounts(next);
    setVoted("restored");
    saveVote(reportId, "restored");
    onUpdate?.(next);
    await voteRestored(reportId).catch(() => {});
    setBusy(false);
  }, [voted, busy, counts, reportId, onUpdate]);

  const isConfirmed = voted === "confirmed";
  const isRestored = voted === "restored";

  return (
    <div className="flex items-center gap-2">
      {/* Still no power */}
      <button
        onClick={handleConfirm}
        disabled={!!voted}
        title={isConfirmed ? "You confirmed this outage" : "I also have no power"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
          ${isConfirmed
            ? "bg-danger/15 text-danger cursor-default"
            : voted
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-danger/10 text-danger hover:bg-danger/20 active:scale-95"
          }`}
      >
        <ThumbsUp size={13} className={isConfirmed ? "fill-danger" : ""} />
        <span>{counts.confirmations}</span>
      </button>

      {/* Already restored */}
      <button
        onClick={handleRestored}
        disabled={!!voted}
        title={isRestored ? "You voted this is restored" : "Already restored"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
          ${isRestored
            ? "bg-success/15 text-success cursor-default"
            : voted
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-success/10 text-success hover:bg-success/20 active:scale-95"
          }`}
      >
        <ThumbsDown size={13} className={isRestored ? "fill-success" : ""} />
        <span>{counts.restoredVotes}</span>
      </button>

      {voted && (
        <span className="text-[10px] text-muted italic">Vote recorded</span>
      )}
    </div>
  );
}
