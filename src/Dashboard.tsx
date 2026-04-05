import { useState } from 'react';

const PERIODS = ['Response', 'Evidence', 'Voting', 'Appeal'] as const;
type Period = typeof PERIODS[number];

const mockCases = [
  {
    id: '0x8f01...ab12',
    court: 'Freelance Disputes',
    description: 'Breach of freelance contract — failed to deliver milestone 2',
    partyAVotingOption: 'Settle for 500 SUI',
    partyBVotingOption: 'Dismiss claim',
    nivstersAssigned: 3,
    status: 'Active',
    currentPeriod: 'Evidence' as Period,
    date: '2026-04-01',
  },
  {
    id: '0xc8fe...e50e',
    court: 'NFT Copyright',
    description: 'Dispute over NFT copyright ownership transferred in transaction',
    partyAVotingOption: 'Return NFT and refund',
    partyBVotingOption: 'Keep NFT, claim invalid',
    nivstersAssigned: 5,
    status: 'Active',
    currentPeriod: 'Voting' as Period,
    date: '2026-04-03',
  },
  {
    id: '0xa12b...9900',
    court: 'Web Dev Delivery',
    description: 'Frontend milestone delivery rejected by client without justification',
    partyAVotingOption: 'Pay remainder',
    partyBVotingOption: 'No payment — substandard work',
    nivstersAssigned: 4,
    status: 'Pending',
    currentPeriod: 'Response' as Period,
    date: '2026-04-04',
  },
  {
    id: '0xb34c...1122',
    court: 'DeFi Liquidations',
    description: 'Oracle price manipulation led to unjust liquidation of position',
    partyAVotingOption: 'Reimburse losses',
    partyBVotingOption: 'Liquidation was valid',
    nivstersAssigned: 7,
    status: 'Resolved',
    outcome: 'Won',
    date: '2026-03-28',
  },
  {
    id: '0xd56e...3344',
    court: 'Freelance Disputes',
    description: 'Logo design delivered 3 weeks late with incomplete deliverables',
    partyAVotingOption: 'Partial refund',
    partyBVotingOption: 'Full payment owed',
    nivstersAssigned: 3,
    status: 'Resolved',
    outcome: 'Lost',
    date: '2026-03-20',
  },
  {
    id: '0xe78f...5566',
    court: 'NFT Copyright',
    description: 'Unauthorized derivative NFT series minted using original artwork',
    partyAVotingOption: 'Cease & royalties',
    partyBVotingOption: 'Independent creation',
    nivstersAssigned: 5,
    status: 'Resolved',
    outcome: 'Won',
    date: '2026-03-15',
  },
];

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Active:   { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  Pending:  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  Resolved: { bg: 'bg-slate-100', text: 'text-slate-600',  dot: 'bg-slate-400' },
};

const outcomeConfig: Record<string, { bg: string; text: string }> = {
  Won:  { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Lost: { bg: 'bg-rose-50',    text: 'text-rose-700' },
};

export default function Dashboard() {
  const [caseTab, setCaseTab] = useState<'active' | 'resolved'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  const open     = mockCases.filter(c => c.status === 'Active').length;
  const pending  = mockCases.filter(c => c.status === 'Pending').length;
  const won      = mockCases.filter(c => (c as any).outcome === 'Won').length;
  const lost     = mockCases.filter(c => (c as any).outcome === 'Lost').length;

  const visibleCases = mockCases.filter(c =>
    caseTab === 'active' ? c.status === 'Active' || c.status === 'Pending' : c.status === 'Resolved'
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active',   value: open,    color: 'text-blue-600',    border: 'border-blue-100' },
          { label: 'Pending',  value: pending, color: 'text-amber-600',   border: 'border-amber-100' },
          { label: 'Won',      value: won,     color: 'text-emerald-600', border: 'border-emerald-100' },
          { label: 'Lost',     value: lost,    color: 'text-rose-600',    border: 'border-rose-100' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white border ${stat.border} p-4 rounded-2xl shadow-sm flex items-center justify-between`}>
            <span className="text-[#473a87]/50 font-semibold text-sm">{stat.label}</span>
            <span className={`text-3xl font-black ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Cases Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black">My Cases</h2>
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
            {(['active', 'resolved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCaseTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold capitalize rounded-lg transition-all ${caseTab === tab ? 'bg-white text-[#473a87] shadow-sm' : 'text-[#473a87]/50 hover:text-[#473a87]'}`}
              >
                {tab === 'active' ? `Active & Pending (${open + pending})` : `Resolved (${won + lost})`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {visibleCases.map((c) => {
            const sc = statusConfig[c.status];
            const oc = (c as any).outcome ? outcomeConfig[(c as any).outcome] : null;
            const isExpanded = expandedId === c.id;
            return (
              <div
                key={c.id}
                className="bg-white border border-[#473a87]/10 rounded-xl overflow-hidden hover:border-[#473a87]/25 transition-all"
              >
                {/* Collapsed row — always visible, click to expand */}
                <div className="flex items-center gap-4 px-5 py-3 cursor-pointer select-none" onClick={() => toggle(c.id)}>
                  {/* Status badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${sc.bg} shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${sc.text}`}>{c.status}</span>
                  </div>

                  {/* Court tag */}
                  <span className="text-[10px] font-bold text-[#473a87]/40 uppercase tracking-wider shrink-0 hidden sm:block">{c.court}</span>

                  {/* Description */}
                  <p className="text-sm font-medium text-[#473a87] truncate flex-1">{c.description}</p>

                  {/* Outcome badge */}
                  {oc && (
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0 ${oc.bg} ${oc.text}`}>
                      {(c as any).outcome}
                    </span>
                  )}

                  {/* Date */}
                  <span className="text-[10px] text-[#473a87]/30 font-semibold shrink-0">{c.date}</span>

                  {/* Animated chevron */}
                  <svg
                    className={`w-4 h-4 text-[#473a87]/30 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-[#473a87]/5 bg-slate-50 px-5 py-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Full description */}
                    <p className="text-sm font-medium text-[#473a87]/80 mb-4">{c.description}</p>

                    {/* Period timeline — active/pending cases only */}
                    {(c.status === 'Active' || c.status === 'Pending') && (c as any).currentPeriod && (
                      <div className="mb-4">
                        <p className="text-[10px] font-black text-[#473a87]/40 uppercase tracking-wider mb-2">Dispute Timeline</p>
                        <div className="flex gap-1">
                          {PERIODS.map((period, idx) => {
                            const activePeriodIdx = PERIODS.indexOf((c as any).currentPeriod as Period);
                            const isPast    = idx < activePeriodIdx;
                            const isCurrent = idx === activePeriodIdx;
                            return (
                              <div key={period} className="flex-1 flex flex-col items-center gap-1">
                                <div className={`w-full h-1.5 rounded-full transition-all ${
                                  isCurrent ? 'bg-[#473a87]' :
                                  isPast    ? 'bg-[#473a87]/30' :
                                              'bg-slate-200'
                                }`}>
                                  {isCurrent && (
                                    <div className="h-full rounded-full bg-[#473a87] animate-pulse" />
                                  )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-wider ${
                                  isCurrent ? 'text-[#473a87]' :
                                  isPast    ? 'text-[#473a87]/40' :
                                              'text-slate-300'
                                }`}>
                                  {isCurrent ? '▶ ' : ''}{period}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Voting options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-xl border border-slate-100 p-3">
                        <p className="text-[10px] font-black text-[#473a87]/40 uppercase tracking-wider mb-1">Party A Voting Option</p>
                        <p className="text-sm font-semibold text-[#473a87]">{c.partyAVotingOption}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-100 p-3">
                        <p className="text-[10px] font-black text-[#473a87]/40 uppercase tracking-wider mb-1">Party B Voting Option</p>
                        <p className="text-sm font-semibold text-[#473a87]">{c.partyBVotingOption}</p>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-4 text-xs text-[#473a87]/50 font-semibold items-center">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {c.nivstersAssigned} Nivsters assigned
                      </span>
                      <span>Court: <span className="text-[#473a87]/70">{c.court}</span></span>
                      <span>Opened: <span className="text-[#473a87]/70">{c.date}</span></span>
                      <button
                        onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(c.id); }}
                        className="flex items-center gap-1 font-mono text-[#473a87]/40 hover:text-[#473a87] transition-colors"
                        title="Copy address"
                      >
                        {c.id}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visibleCases.length === 0 && (
            <div className="text-center py-12 text-[#473a87]/30 font-semibold">No {caseTab} cases.</div>
          )}
        </div>
      </div>
    </div>
  );
}
