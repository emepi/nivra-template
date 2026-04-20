import type { PartyDispute } from './Dashboard';

const PERIODS = ['Response', 'Evidence', 'Voting', 'Appeal'] as const;
type Period = typeof PERIODS[number];

export default function DisputePage({ dispute, onBack }: { dispute: PartyDispute, onBack: () => void }) {
  const getPeriod = (d: PartyDispute) => {
    let elapsed = Date.now() - d.round_init_ms;
    if (elapsed < d.response_period_ms) return 'Response';
    elapsed -= d.response_period_ms;
    elapsed -= d.draw_period_ms;
    if (elapsed < d.evidence_period_ms) return 'Evidence';
    elapsed -= d.evidence_period_ms;
    if (elapsed < d.voting_period_ms) return 'Voting';
    return 'Appeal';
  };

  const getStatus = (d: PartyDispute) => {
    if (d.dispute_status === 1 || d.dispute_status === 2 || d.winner_party) return 'Resolved';
    // Let's assume if it's not resolved, it's Active
    return 'Active';
  };

  const status = getStatus(dispute);
  const currentPeriod = getPeriod(dispute);
  const dateStr = new Date(dispute.checkpoint_timestamp_ms).toLocaleDateString();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors bg-white shadow-sm border border-slate-200"
          title="Back to Dashboard"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-2xl font-black text-[#473a87]">Dispute Details</h2>
      </div>

      <div className="bg-white border border-[#473a87]/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-6 border-b border-[#473a87]/5 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#473a87]/40 uppercase tracking-widest">{dispute.court_name || dispute.court_id}</span>
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                {status}
              </span>
            </div>
            <span className="text-xs text-[#473a87]/40 font-semibold">{dateStr}</span>
          </div>
          
          <h3 className="text-lg font-bold text-[#473a87] min-h-[28px]">{dispute.description || dispute.contract_id}</h3>
        </div>

        <div className="p-6">
          {/* Period timeline — active cases only */}
          {status !== 'Resolved' && (
            <div className="mb-8">
              <p className="text-[11px] font-black text-[#473a87]/40 uppercase tracking-wider mb-3">Dispute Timeline</p>
              <div className="flex gap-2">
                {PERIODS.map((period, idx) => {
                  const activePeriodIdx = PERIODS.indexOf(currentPeriod as Period);
                  const isPast = idx < activePeriodIdx;
                  const isCurrent = idx === activePeriodIdx;
                  return (
                    <div key={period} className="flex-1 flex flex-col items-center gap-2">
                      <div className={`w-full h-2 rounded-full transition-all ${isCurrent ? 'bg-[#473a87]' :
                        isPast ? 'bg-[#473a87]/30' :
                          'bg-slate-100'
                        }`}>
                        {isCurrent && (
                          <div className="h-full rounded-full bg-[#473a87] animate-pulse" />
                        )}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-[#473a87]' :
                        isPast ? 'text-[#473a87]/50' :
                          'text-slate-400'
                        }`}>
                        {period}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Voting options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
              <p className="text-[11px] font-black text-[#473a87]/40 uppercase tracking-wider mb-2">Party A Option</p>
              <p className="text-base font-semibold text-[#473a87]">{dispute.options[0] || 'N/A'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
              <p className="text-[11px] font-black text-[#473a87]/40 uppercase tracking-wider mb-2">Party B Option</p>
              <p className="text-base font-semibold text-[#473a87]">{dispute.options[1] || 'N/A'}</p>
            </div>
          </div>

          <hr className="mb-6 border-[#473a87]/5" />

          {/* Meta row */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-[#473a87]/50">Dispute ID</span>
              <button
                onClick={() => navigator.clipboard.writeText(dispute.dispute_id)}
                className="flex items-center gap-1.5 font-mono text-[#473a87] hover:text-[#473a87]"
                title="Copy Dispute ID"
              >
                {dispute.dispute_id}
                <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-[#473a87]/50">Arbitrable Contract</span>
              <button
                onClick={() => navigator.clipboard.writeText(dispute.contract_id)}
                className="flex items-center gap-1.5 font-mono text-[#473a87] hover:text-[#473a87]"
                title="Copy Contract Address"
              >
                {dispute.contract_id}
                <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            
            <div className="flex justify-between items-center text-sm font-medium mt-3">
              <span className="text-[#473a87]/50">Rounds</span>
              <span className="text-[#473a87] font-bold bg-slate-100 px-3 py-0.5 rounded-lg">Round {dispute.current_round + 1}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
