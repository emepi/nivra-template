import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { useEffect, useState } from 'react';
import { useNetworkConfig } from './constants';

const PERIODS = ['Response', 'Evidence', 'Voting', 'Appeal'] as const;
type Period = typeof PERIODS[number];

const DISPUTES_ENDPOINT = "http://127.0.0.1:8080/party_disputes";
const STATS_ENDPOINT = "http://127.0.0.1:8080/party_stats";

type PartyStatsResponse = {
  total_cases: number,
  cases_won: number,
  cases_lost: number,
  cases_cancelled: number,
}

export type PartyDisputesResponse = {
  active_disputes: PartyDispute[],
  active_disputes_count: number,
  resolved_disputes: PartyDispute[],
  resolved_disputes_count: number,
}

export type PartyDispute = {
  dispute_id: string,
  contract_id: string,
  court_id: string,
  court_name: string,
  description: string,
  dispute_status: number,
  winner_option: string | null,
  winner_party: string | null,
  current_round: number,
  last_payer: string,
  appeals_used: number,
  options: string[],
  options_party_mapping: string[],
  round_init_ms: number,
  response_period_ms: number,
  draw_period_ms: number,
  evidence_period_ms: number,
  voting_period_ms: number,
  appeal_period_ms: number,
  checkpoint_timestamp_ms: number,
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Active: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  Resolved: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const outcomeConfig: Record<string, { bg: string; text: string }> = {
  Won: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Lost: { bg: 'bg-rose-50', text: 'text-rose-700' },
};

const truncateAddress = (addr: string) => addr && addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;

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

import DisputePage from './DisputePage';

export default function Dashboard() {
  const [caseTab, setCaseTab] = useState<'active' | 'resolved'>('active');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<PartyDisputesResponse | null>(null);
  const [stats, setStats] = useState<PartyStatsResponse | null>(null);

  const account = useCurrentAccount();
  const networkConfig = useNetworkConfig();

  useEffect(() => {
    if (!account?.address) return;

    async function fetchDisputes() {
      const response = await fetch(`${DISPUTES_ENDPOINT}/${account?.address}`);
      const data = await response.json();
      setDisputes(data);
    }

    async function fetchStats() {
      const response = await fetch(`${STATS_ENDPOINT}/${account?.address}`);
      const data = await response.json();
      setStats(data);
    }

    fetchDisputes();
    fetchStats();
  }, [account?.address, networkConfig]);

  type Case = {
    disputeId: string;
    id: string; // contract_id
    court: string;
    description: string;
    partyAVotingOption: string;
    partyBVotingOption: string;
    nivstersAssigned: number;
    status: string;
    currentPeriod: Period;
    date: string;
    outcome: string | null;
  };

  const allCases: Case[] = [];
  if (disputes) {
    disputes.active_disputes.forEach(d => {
      allCases.push({
        disputeId: d.dispute_id,
        id: d.contract_id,
        court: d.court_name || d.court_id,
        description: d.description,
        partyAVotingOption: d.options[0] || 'Unknown',
        partyBVotingOption: d.options[1] || 'Unknown',
        nivstersAssigned: 0,
        status: 'Active',
        currentPeriod: getPeriod(d) as Period,
        date: new Date(d.checkpoint_timestamp_ms).toLocaleDateString(),
        outcome: null,
      });
    });
    disputes.resolved_disputes.forEach(d => {
      allCases.push({
        disputeId: d.dispute_id,
        id: d.contract_id,
        court: d.court_name || d.court_id,
        description: d.description,
        partyAVotingOption: d.options[0] || 'Unknown',
        partyBVotingOption: d.options[1] || 'Unknown',
        nivstersAssigned: 0,
        status: 'Resolved',
        currentPeriod: getPeriod(d) as Period,
        date: new Date(d.checkpoint_timestamp_ms).toLocaleDateString(),
        outcome: d.winner_party === account?.address ? 'Won' : 'Lost',
      });
    });
  }

  const open = allCases.filter(c => c.status === 'Active').length;
  const pending = allCases.filter(c => c.status === 'Pending').length;
  const resolvedCount = allCases.filter(c => c.status === 'Resolved').length;

  const visibleCases = allCases.filter(c =>
    caseTab === 'active' ? c.status === 'Active' || c.status === 'Pending' : c.status === 'Resolved'
  );

  if (selectedDisputeId && disputes) {
    const selectedDispute = disputes.active_disputes.find(d => d.dispute_id === selectedDisputeId) ||
      disputes.resolved_disputes.find(d => d.dispute_id === selectedDisputeId);
    if (selectedDispute) {
      return <DisputePage dispute={selectedDispute} onBack={() => setSelectedDisputeId(null)} />;
    }
  }

  const statTotal = stats ? stats.total_cases : 0;
  const statWon = stats ? stats.cases_won : 0;
  const statLost = stats ? stats.cases_lost : 0;
  const statCancelled = stats ? stats.cases_cancelled : 0;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cases', value: statTotal, color: 'text-[#473a87]', border: 'border-[#473a87]/10' },
          { label: 'Won', value: statWon, color: 'text-emerald-600', border: 'border-emerald-100' },
          { label: 'Lost', value: statLost, color: 'text-rose-600', border: 'border-rose-100' },
          { label: 'Cancelled', value: statCancelled, color: 'text-slate-600', border: 'border-slate-100' },
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
                {tab === 'active' ? `Active & Pending (${open + pending})` : `Resolved (${resolvedCount})`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {visibleCases.map((c) => {
            const sc = statusConfig[c.status];
            const oc = (c as any).outcome ? outcomeConfig[(c as any).outcome] : null;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedDisputeId(c.disputeId)}
                className="bg-white border border-[#473a87]/10 rounded-xl overflow-hidden hover:border-[#473a87]/25 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4 px-5 py-3 select-none">
                  {/* Status badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${sc.bg} shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${sc.text}`}>{c.status}</span>
                  </div>

                  {/* Court tag */}
                  <span className="text-[10px] font-bold text-[#473a87]/40 uppercase tracking-wider shrink-0 hidden sm:block">{c.court}</span>

                  {/* Description */}
                  <p className="text-sm font-medium text-[#473a87] truncate flex-1">{c.description || "No description provided"}</p>

                  {/* Outcome badge */}
                  {oc && (
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0 ${oc.bg} ${oc.text}`}>
                      {(c as any).outcome}
                    </span>
                  )}

                  {/* Date */}
                  <span className="text-[10px] text-[#473a87]/30 font-semibold shrink-0 group-hover:text-[#473a87]/60 transition-colors">{c.date}</span>

                  {/* Animated chevron pointer */}
                  <svg
                    className={`w-4 h-4 text-[#473a87]/30 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#473a87]/60`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
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
