import { useState } from 'react';

const PERIODS = ['Response', 'Evidence', 'Voting', 'Appeal'] as const;
type Period = typeof PERIODS[number];

const mockJurorCases = [
  {
    id: '0x9a3c...bb01',
    court: 'Freelance Disputes',
    description: 'Dispute over missed deliverables in a UI design contract',
    partyAVotingOption: 'Refund 80% of payment',
    partyBVotingOption: 'Work was complete, full payment owed',
    status: 'Active',
    currentPeriod: 'Voting' as Period,
    myVote: null as string | null,
    date: '2026-04-02',
    rewardNvr: 0,
    rewardSui: 0,
  },
  {
    id: '0xd72a...cc14',
    court: 'DeFi Liquidations',
    description: 'Contested liquidation of leveraged ETH position due to oracle glitch',
    partyAVotingOption: 'Reimburse 60% of losses',
    partyBVotingOption: 'Liquidation was protocol-valid',
    status: 'Active',
    currentPeriod: 'Evidence' as Period,
    myVote: null as string | null,
    date: '2026-04-04',
    rewardNvr: 0,
    rewardSui: 0,
  },
  {
    id: '0xf81b...dd37',
    court: 'NFT Copyright',
    description: 'Stolen artwork used in NFT collection without attribution',
    partyAVotingOption: 'Remove collection and royalties',
    partyBVotingOption: 'Original independent creation',
    status: 'Past',
    currentPeriod: 'Appeal' as Period,
    myVote: 'Remove collection and royalties',
    outcome: 'Correct',
    date: '2026-03-25',
    rewardNvr: 12,
    rewardSui: 2,
  },
  {
    id: '0xc55d...ee90',
    court: 'Web Dev Delivery',
    description: 'Backend API not shipped per agreed specification after 6-week sprint',
    partyAVotingOption: 'Full refund',
    partyBVotingOption: 'Partial work deserves partial pay',
    status: 'Past',
    currentPeriod: 'Appeal' as Period,
    myVote: 'Partial work deserves partial pay',
    outcome: 'Incorrect',
    date: '2026-03-18',
    rewardNvr: 0,
    rewardSui: 0,
  },
  {
    id: '0xb22e...ff55',
    court: 'Freelance Disputes',
    description: 'Copywriter delivered plagiarised content for a brand campaign',
    partyAVotingOption: 'Return payment and NDA breach penalty',
    partyBVotingOption: 'Content was original',
    status: 'Past',
    currentPeriod: 'Appeal' as Period,
    myVote: 'Return payment and NDA breach penalty',
    outcome: 'Correct',
    date: '2026-03-10',
    rewardNvr: 18,
    rewardSui: 3,
  },
];

const outcomeStyle: Record<string, { text: string; bg: string }> = {
  Correct: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  Incorrect: { text: 'text-rose-700', bg: 'bg-rose-50' },
};

export default function NivsterDashboard() {
  const [caseTab, setCaseTab] = useState<'active' | 'past'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const totalCases = mockJurorCases.length;
  const wonCases = mockJurorCases.filter(c => c.outcome === 'Correct').length;
  const totalNvr = mockJurorCases.reduce((sum, c) => sum + c.rewardNvr, 0);
  const totalSui = mockJurorCases.reduce((sum, c) => sum + c.rewardSui, 0);

  const visible = mockJurorCases.filter(c => caseTab === 'active' ? c.status === 'Active' : c.status === 'Past');

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cases', value: totalCases, color: 'text-[#473a87]', border: 'border-[#473a87]/10' },
          { label: 'Correct Votes', value: wonCases, color: 'text-emerald-600', border: 'border-emerald-100' },
          { label: 'NVR Earned', value: `${totalNvr} NVR`, color: 'text-purple-600', border: 'border-purple-100' },
          { label: 'SUI Earned', value: `${totalSui} SUI`, color: 'text-blue-600', border: 'border-blue-100' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white border ${stat.border} p-4 rounded-2xl shadow-sm flex items-center justify-between`}>
            <span className="text-[#473a87]/50 font-semibold text-sm">{stat.label}</span>
            <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Juror Cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black">Juror Cases</h2>
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
            {(['active', 'past'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCaseTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${caseTab === tab ? 'bg-white text-[#473a87] shadow-sm' : 'text-[#473a87]/50 hover:text-[#473a87]'}`}
              >
                {tab === 'active' ? `Active (${mockJurorCases.filter(c => c.status === 'Active').length})` : `Past (${mockJurorCases.filter(c => c.status === 'Past').length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {visible.map(c => {
            const isExpanded = expandedId === c.id;
            const oc = c.outcome ? outcomeStyle[c.outcome] : null;

            return (
              <div key={c.id} className="bg-white border border-[#473a87]/10 rounded-xl overflow-hidden hover:border-[#473a87]/25 transition-all">

                {/* Collapsed row */}
                <div className="flex items-center gap-4 px-5 py-3 cursor-pointer select-none" onClick={() => toggle(c.id)}>
                  {/* Status dot */}
                  {c.status === 'Active' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Active</span>
                    </div>
                  ) : oc ? (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${oc.bg} shrink-0`}>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${oc.text}`}>{c.outcome}</span>
                    </div>
                  ) : null}

                  {/* Court */}
                  <span className="text-[10px] font-bold text-[#473a87]/40 uppercase tracking-wider shrink-0 hidden sm:block">{c.court}</span>

                  {/* Description */}
                  <p className="text-sm font-medium text-[#473a87] truncate flex-1">{c.description}</p>

                  {/* Rewards (past only) */}
                  {c.status === 'Past' && c.rewardNvr > 0 && (
                    <span className="text-[10px] font-black text-purple-600 shrink-0">+{c.rewardNvr} NVR</span>
                  )}
                  {c.status === 'Past' && c.rewardSui > 0 && (
                    <span className="text-[10px] font-black text-blue-600 shrink-0">+{c.rewardSui} SUI</span>
                  )}

                  {/* Date */}
                  <span className="text-[10px] text-[#473a87]/30 font-semibold shrink-0">{c.date}</span>

                  {/* Chevron */}
                  <svg className={`w-4 h-4 text-[#473a87]/30 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-[#473a87]/5 bg-slate-50 px-5 py-4 animate-in fade-in slide-in-from-top-1 duration-200 space-y-4">

                    {/* Period timeline — active only */}
                    {c.status === 'Active' && (
                      <div>
                        <p className="text-[10px] font-black text-[#473a87]/40 uppercase tracking-wider mb-2">Dispute Timeline</p>
                        <div className="flex gap-1">
                          {PERIODS.map((period, idx) => {
                            const activeIdx = PERIODS.indexOf(c.currentPeriod);
                            const isPast = idx < activeIdx;
                            const isCurrent = idx === activeIdx;
                            return (
                              <div key={period} className="flex-1 flex flex-col items-center gap-1">
                                <div className={`w-full h-1.5 rounded-full ${isCurrent ? 'bg-[#473a87]' : isPast ? 'bg-[#473a87]/30' : 'bg-slate-200'}`}>
                                  {isCurrent && <div className="h-full rounded-full bg-[#473a87] animate-pulse" />}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-wider ${isCurrent ? 'text-[#473a87]' : isPast ? 'text-[#473a87]/40' : 'text-slate-300'}`}>
                                  {isCurrent ? '▶ ' : ''}{period}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* My vote (past) */}
                    {c.status === 'Past' && c.myVote && (
                      <div className="bg-white rounded-xl border border-slate-100 p-3">
                        <p className="text-[10px] font-black text-[#473a87]/40 uppercase tracking-wider mb-1">My Vote</p>
                        <p className="text-sm font-semibold text-[#473a87]">{c.myVote}</p>
                      </div>
                    )}

                    {/* Voting options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl border border-slate-100 p-3">
                        <p className="text-[10px] font-black text-[#473a87]/40 uppercase tracking-wider mb-1">Party A Option</p>
                        <p className="text-sm font-semibold text-[#473a87]">{c.partyAVotingOption}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-100 p-3">
                        <p className="text-[10px] font-black text-[#473a87]/40 uppercase tracking-wider mb-1">Party B Option</p>
                        <p className="text-sm font-semibold text-[#473a87]">{c.partyBVotingOption}</p>
                      </div>
                    </div>

                    {/* Rewards row (past) */}
                    {c.status === 'Past' && (
                      <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#473a87]/50">
                        {c.rewardNvr > 0 && <span className="text-purple-600 font-black">+{c.rewardNvr} NVR earned</span>}
                        {c.rewardSui > 0 && <span className="text-blue-600 font-black">+{c.rewardSui} SUI earned</span>}
                        {c.rewardNvr === 0 && c.rewardSui === 0 && <span className="text-rose-400">No reward — incorrect vote</span>}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap gap-4 text-xs text-[#473a87]/40 font-semibold items-center">
                      <span>Court: <span className="text-[#473a87]/60">{c.court}</span></span>
                      <span>Date: <span className="text-[#473a87]/60">{c.date}</span></span>
                      <button
                        onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(c.id); }}
                        className="flex items-center gap-1 font-mono hover:text-[#473a87] transition-colors"
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

          {visible.length === 0 && (
            <div className="text-center py-12 text-[#473a87]/30 font-semibold">No {caseTab} cases.</div>
          )}
        </div>
      </div>
    </div>
  );
}
