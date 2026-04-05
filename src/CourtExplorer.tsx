import { useState } from 'react';

const ParamItem = ({ label, value, explanation }: { label: string; value: React.ReactNode; explanation: string }) => {
  return (
    <li className="flex justify-between items-center gap-3 border-b border-[#473a87]/5 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0 relative group">
      <span
        className="text-[#473a87]/60 text-[11px] flex items-center cursor-help group-hover:text-[#473a87] transition-colors"
        title=""
      >
        {label}
        <svg className="w-3.5 h-3.5 ml-1.5 opacity-50 relative bottom-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm text-[11px] font-bold text-[#473a87] z-10">{value}</span>

      {/* Hover Tooltip */}
      <div className="absolute bottom-[calc(100%+0.5rem)] left-0 w-64 p-3 bg-slate-800 text-white text-[11px] font-medium leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50">
        {explanation}
        <div className="absolute top-full left-6 -mt-[1px] border-4 border-transparent border-t-slate-800"></div>
      </div>
    </li>
  );
};

const mockCourts = [
  {
    id: '0xc123...4567',
    metadata: { name: 'Freelance Disputes', category: 'Services', description: 'Resolves contract disputes between freelancers and clients over deliverables and milestones.', ai_court: false },
    timetable: { response_period_ms: 86400000, draw_period_ms: 43200000, evidence_period_ms: 172800000, voting_period_ms: 86400000, appeal_period_ms: 172800000 },
    economics: { min_stake: 50, reputation_requirement: 100, init_nivster_count: 5, sanction_model: 1, coefficient: 2, dispute_fee: 10, treasury_share: 5, treasury_share_nvr: 2, empty_vote_penalty: 5 },
    workerpool_size: 154,
  },
  {
    id: '0xf567...3214',
    metadata: { name: 'Web Dev Delivery', category: 'Services', description: 'Software and frontend engineering milestone verification protocols.', ai_court: false },
    timetable: { response_period_ms: 86400000, draw_period_ms: 43200000, evidence_period_ms: 172800000, voting_period_ms: 86400000, appeal_period_ms: 172800000 },
    economics: { min_stake: 20, reputation_requirement: 50, init_nivster_count: 5, sanction_model: 1, coefficient: 1, dispute_fee: 5, treasury_share: 2, treasury_share_nvr: 1, empty_vote_penalty: 2 },
    workerpool_size: 89,
  },
  {
    id: '0xd890...1234',
    metadata: { name: 'NFT Copyright', category: 'Digital Assets', description: 'Handles copyright claims and ownership verification of on-chain digital assets and art.', ai_court: true },
    timetable: { response_period_ms: 172800000, draw_period_ms: 43200000, evidence_period_ms: 345600000, voting_period_ms: 172800000, appeal_period_ms: 345600000 },
    economics: { min_stake: 100, reputation_requirement: 250, init_nivster_count: 7, sanction_model: 2, coefficient: 2, dispute_fee: 25, treasury_share: 10, treasury_share_nvr: 5, empty_vote_penalty: 10 },
    workerpool_size: 312,
  },
  {
    id: '0xe567...8901',
    metadata: { name: 'DeFi Liquidations', category: 'Financial', description: 'Fast-track resolution for contested DeFi liquidations and oracle errors.', ai_court: true },
    timetable: { response_period_ms: 43200000, draw_period_ms: 21600000, evidence_period_ms: 86400000, voting_period_ms: 43200000, appeal_period_ms: 86400000 },
    economics: { min_stake: 500, reputation_requirement: 1000, init_nivster_count: 3, sanction_model: 3, coefficient: 1, dispute_fee: 100, treasury_share: 20, treasury_share_nvr: 10, empty_vote_penalty: 50 },
    workerpool_size: 47,
  },
];

// Mock per-court user data (keyed by court id)
const mockUserCourtData: Record<string, { stake: number; unclaimedSui: number; lockedNvr: number; inPool: boolean }> = {
  '0xc123...4567': { stake: 80,  unclaimedSui: 4.5, lockedNvr: 20, inPool: true  },
  '0xf567...3214': { stake: 0,   unclaimedSui: 0,   lockedNvr: 0,  inPool: false },
  '0xd890...1234': { stake: 150, unclaimedSui: 12,  lockedNvr: 50, inPool: true  },
  '0xe567...8901': { stake: 0,   unclaimedSui: 0,   lockedNvr: 0,  inPool: false },
};

type UserCourtData = {
  stake: number;
  unclaimedSui: number;
  lockedNvr: number;
  inPool: boolean;
};

const QUICK_WITHDRAW_AMOUNT = 25;

const formatAmount = (value: number) => (
  Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, '')
);

interface CourtExplorerProps {
  nivsterMode?: boolean;
}

export default function CourtExplorer({ nivsterMode = false }: CourtExplorerProps) {
  const [activeCourtCategory, setActiveCourtCategory] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [userCourtState, setUserCourtState] = useState<Record<string, UserCourtData>>(mockUserCourtData);

  const groupedCourts = mockCourts.reduce((acc, court) => {
    const cat = court.metadata.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(court);
    return acc;
  }, {} as Record<string, typeof mockCourts>);

  const categories = Object.keys(groupedCourts);
  const activeCategory = activeCourtCategory || categories[0] || '';
  const courtsInCategory = groupedCourts[activeCategory] || [];
  const activeCourt = courtsInCategory.find(c => c.id === selectedCourtId) || courtsInCategory[0];

  const updateUserCourtData = (courtId: string, updater: (current: UserCourtData) => UserCourtData) => {
    setUserCourtState(prev => ({
      ...prev,
      [courtId]: updater(prev[courtId] ?? { stake: 0, unclaimedSui: 0, lockedNvr: 0, inPool: false }),
    }));
  };

  const userCourtData = activeCourt ? userCourtState[activeCourt.id] ?? { stake: 0, unclaimedSui: 0, lockedNvr: 0, inPool: false } : null;
  const isInPool = Boolean(userCourtData?.inPool);
  const availableToWithdraw = userCourtData ? Math.max(userCourtData.stake - userCourtData.lockedNvr, 0) : 0;
  const stakeAmount = activeCourt && userCourtData
    ? Math.max(activeCourt.economics.min_stake - userCourtData.stake, 0) || 25
    : 25;
  const withdrawAmount = Math.min(QUICK_WITHDRAW_AMOUNT, availableToWithdraw);

  const handleStake = () => {
    if (!activeCourt) return;

    updateUserCourtData(activeCourt.id, current => ({
      ...current,
      stake: current.stake + stakeAmount,
    }));
  };

  const handleWithdraw = () => {
    if (!activeCourt || withdrawAmount === 0) return;

    updateUserCourtData(activeCourt.id, current => ({
      ...current,
      stake: Math.max(current.lockedNvr, current.stake - withdrawAmount),
    }));
  };

  const toggleWorkerpoolStatus = () => {
    if (!activeCourt) return;

    updateUserCourtData(activeCourt.id, current => ({
      ...current,
      inPool: !current.inPool,
    }));
  };

  return (
    <div className="h-full min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-3">
      <div className="space-y-1">
        <h2 className="text-2xl font-black">Court Explorer</h2>
        <p className="text-[#473a87]/60 font-medium">Browse active jurisdictions and their specific operational rulesets.</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#473a87]/10 pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCourtCategory(cat); setSelectedCourtId(null); }}
            className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${activeCategory === cat ? 'bg-[#473a87] text-white shadow-md' : 'text-[#473a87]/60 hover:text-[#473a87] hover:bg-[#473a87]/5'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Master-Detail Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden border border-[#473a87]/10 rounded-2xl bg-white shadow-sm">
        {/* Sidebar */}
        <div className="w-[31%] border-r border-[#473a87]/10 bg-slate-50 flex flex-col">
          <div className="p-3 border-b border-[#473a87]/5 text-[11px] font-bold text-[#473a87]/40 uppercase tracking-widest bg-slate-100/50">
            {activeCategory} Courts
          </div>
          {courtsInCategory.map(court => {
            const inPool = nivsterMode && userCourtState[court.id]?.inPool;
            return (
              <button
                key={court.id}
                onClick={() => setSelectedCourtId(court.id)}
                className={`w-full text-left p-4 border-b border-[#473a87]/5 hover:bg-white transition-colors flex flex-col ${activeCourt?.id === court.id ? 'bg-white border-l-4 border-l-[#473a87]' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h4 className="font-bold text-[#473a87] text-sm leading-tight">{court.metadata.name}</h4>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {court.metadata.ai_court && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] uppercase tracking-wider font-black rounded-lg">AI Jury</span>
                    )}
                    {nivsterMode && inPool && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] uppercase tracking-wider font-black rounded-lg">Joined</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#473a87]/60 line-clamp-2">{court.metadata.description}</p>
              </button>
            );
          })}
          {courtsInCategory.length === 0 && (
            <div className="p-8 text-center text-[#473a87]/40 font-semibold text-sm">No courts found.</div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="w-[69%] bg-slate-50/50 flex flex-col min-h-0">
          {activeCourt ? (
            <div className="p-5 animate-in fade-in flex-1 flex flex-col gap-3 min-h-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => navigator.clipboard.writeText(activeCourt.id)}
                    className="inline-flex items-center px-2.5 py-1 bg-[#473a87]/5 hover:bg-[#473a87]/15 transition-colors text-[#473a87]/60 hover:text-[#473a87] text-[11px] font-mono font-semibold rounded-md cursor-pointer"
                    title="Copy address"
                  >
                    <span>{activeCourt.id}</span>
                    <svg className="w-3 h-3 ml-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {activeCourt.metadata.ai_court && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] uppercase tracking-wider font-black rounded-lg shrink-0">AI Jury Enabled</span>
                    )}
                    <span className="px-3 py-1 bg-slate-200/70 text-[#473a87]/70 text-[10px] uppercase tracking-wider font-black rounded-lg shrink-0">
                      Pool {activeCourt.workerpool_size}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black leading-tight">{activeCourt.metadata.name}</h2>
                </div>
                <p className="text-sm font-medium leading-snug pr-2 opacity-80">{activeCourt.metadata.description}</p>
              </div>

              {/* Nivster user panel */}
              {nivsterMode && userCourtData && (
                <div className="bg-white border border-[#473a87]/10 rounded-2xl p-3.5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h5 className="text-[10px] uppercase tracking-widest font-black text-[#473a87]/50">My Position</h5>
                      <p className="text-[11px] font-semibold text-[#473a87]/45">
                        Available to withdraw: {formatAmount(availableToWithdraw)} NVR
                      </p>
                    </div>

                    {/* Join / Leave workerpool toggle */}
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isInPool ? 'text-emerald-600' : 'text-[#473a87]/40'}`}>
                        {isInPool ? 'In Pool' : 'Not Joined'}
                      </span>
                      <button
                        onClick={toggleWorkerpoolStatus}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${isInPool ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        title={isInPool ? 'Leave workerpool' : 'Join workerpool'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isInPool ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-1">My Stake</p>
                      <p className="text-base font-black text-purple-700">{formatAmount(userCourtData.stake)} <span className="text-[10px]">NVR</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-1">Unclaimed</p>
                      <p className="text-base font-black text-blue-600">{formatAmount(userCourtData.unclaimedSui)} <span className="text-[10px]">SUI</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-1">Locked</p>
                      <p className="text-base font-black text-amber-600">{formatAmount(userCourtData.lockedNvr)} <span className="text-[10px]">NVR</span></p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#473a87]/8 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleStake}
                        className="px-3 py-2 rounded-xl bg-[#473a87] text-white text-[11px] font-black uppercase tracking-wider shadow-sm hover:bg-[#3b306f] transition-colors"
                      >
                        Stake
                      </button>
                      <button
                        onClick={handleWithdraw}
                        disabled={withdrawAmount === 0}
                        className={`px-3 py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-colors ${
                          withdrawAmount === 0
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'border-[#473a87]/15 bg-white text-[#473a87] hover:bg-slate-50'
                        }`}
                      >
                        Withdraw
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-[#473a87]/45">
                      Min stake to join: {activeCourt.economics.min_stake} NVR
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Timetable Panel */}
                <div className="bg-white border border-[#473a87]/10 rounded-2xl p-3.5 shadow-sm">
                  <h5 className="text-[10px] uppercase tracking-widest font-black text-[#473a87]/50 mb-2 border-b border-[#473a87]/10 pb-2">Timetable Parameters</h5>
                  <ul className="text-xs font-semibold text-[#473a87]">
                    <ParamItem label="Response Period" value={`${activeCourt.timetable.response_period_ms / 3600000}h`} explanation="Time allowed for the defendant to respond to the dispute before automatic default." />
                    <ParamItem label="Evidence Period" value={`${activeCourt.timetable.evidence_period_ms / 3600000}h`} explanation="Timeframe where both parties can upload supporting documents and files." />
                    <ParamItem label="Voting Period" value={`${activeCourt.timetable.voting_period_ms / 3600000}h`} explanation="Duration the selected Nivsters have to deliberate and cast their verdict." />
                    <ParamItem label="Appeal Period" value={`${activeCourt.timetable.appeal_period_ms / 3600000}h`} explanation="Window after a verdict where losing parties can escalate the case." />
                  </ul>
                </div>

                {/* Economics Panel */}
                <div className="bg-white border border-[#473a87]/10 rounded-2xl p-3.5 shadow-sm">
                  <h5 className="text-[10px] uppercase tracking-widest font-black text-[#473a87]/50 mb-2 border-b border-[#473a87]/10 pb-2">Economics Rules</h5>
                  <ul className="text-xs font-semibold text-[#473a87]">
                    <ParamItem label="Min Stake" value={<span className="text-purple-700">{activeCourt.economics.min_stake} NVR</span>} explanation="The minimum amount of tokens required for a Nivster to join this court's workerpool." />
                    <ParamItem label="Req. Rep" value={`${Math.min(100, Math.max(0, activeCourt.economics.reputation_requirement))}%`} explanation="The minimum reputation score a Nivster must hold to be drawn for cases here." />
                    <ParamItem label="Dispute Fee" value={<span className="text-blue-600">{activeCourt.economics.dispute_fee} SUI</span>} explanation="The baseline cost charged to parties to open a dispute in this jurisdiction." />
                    <ParamItem label="Nivsters Count" value={activeCourt.economics.init_nivster_count} explanation="The number of jurors drawn per standard case in this court." />
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[#473a87]/40 font-semibold">Select a court to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
