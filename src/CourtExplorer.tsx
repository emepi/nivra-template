import { coinWithBalance, Transaction } from '@mysten/sui/transactions';
import { useEffect, useState } from 'react';
import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { useNetworkConfig } from './constants';
import { dAppKit } from './dapp-kit';

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

type UserCourtData = {
  court: string;
  nvr: number;
  sui: number;
  locked_nvr: number;
  in_worker_pool: boolean;
};

export type Court = {
  court_id: string;
  name: string;
  category: string;
  description: string;
  ai_court: boolean;
  response_period_ms: number;
  draw_period_ms: number;
  evidence_period_ms: number;
  voting_period_ms: number;
  appeal_period_ms: number;
  min_stake: number;
  reputation_requirement: number;
  init_nivster_count: number;
  sanction_model: number;
  coefficient: number;
  dispute_fee: number;
  treasury_share: number;
  treasury_share_nvr: number;
  empty_vote_penalty: number;
  status: number;
  modified: string;
  workerpool_size?: number;
};

const COURTS_ENDPOINT = 'http://127.0.0.1:8080/courts';
const STAKES_ENDPOINT = 'http://127.0.0.1:8080/stakes';
const initialUserCourtData: Record<string, UserCourtData> = {};

const NVR_DECIMALS = 1_000_000;
const SUI_DECIMALS = 1_000_000_000;

const formatAmount = (value: number) => (
  Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, '')
);

const createEmptyUserCourtData = (courtId: string): UserCourtData => ({
  court: courtId,
  nvr: 0,
  sui: 0,
  locked_nvr: 0,
  in_worker_pool: false,
});

interface CourtExplorerProps {
  nivsterMode?: boolean;
}

export default function CourtExplorer({ nivsterMode = false }: CourtExplorerProps) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const networkConfig = useNetworkConfig();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoadingCourts, setIsLoadingCourts] = useState(true);
  const [courtLoadError, setCourtLoadError] = useState<string | null>(null);
  const [activeCourtCategory, setActiveCourtCategory] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [userCourtState, setUserCourtState] = useState<Record<string, UserCourtData>>(initialUserCourtData);
  const [userCourtLoadError, setUserCourtLoadError] = useState<string | null>(null);
  const [isStakeDialogOpen, setIsStakeDialogOpen] = useState(false);
  const [stakeInput, setStakeInput] = useState('');
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawNvrInput, setWithdrawNvrInput] = useState('');
  const [withdrawSuiInput, setWithdrawSuiInput] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [availableNvrBalance, setAvailableNvrBalance] = useState<number | null>(null);
  const [isLoadingNvrBalance, setIsLoadingNvrBalance] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadCourts = async () => {
      try {
        setIsLoadingCourts(true);
        setCourtLoadError(null);

        const response = await fetch(COURTS_ENDPOINT, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load courts (${response.status})`);
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Court response was not an array');
        }

        setCourts(data as Court[]);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setCourtLoadError(error instanceof Error ? error.message : 'Failed to load courts');
        setCourts([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCourts(false);
        }
      }
    };

    void loadCourts();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!nivsterMode || !account?.address) {
      setUserCourtState({});
      setUserCourtLoadError(null);
      return;
    }

    const controller = new AbortController();

    const loadUserCourtData = async () => {
      try {
        setUserCourtLoadError(null);

        const response = await fetch(`${STAKES_ENDPOINT}/${account.address}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load stakes (${response.status})`);
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Stake response was not an array');
        }

        const stakes = data;
        const nextState = stakes.reduce((acc, entry) => {
          if (
            entry &&
            typeof entry === 'object' &&
            typeof (entry as UserCourtData).court === 'string' &&
            typeof (entry as UserCourtData).nvr === 'number' &&
            typeof (entry as UserCourtData).sui === 'number' &&
            typeof (entry as UserCourtData).locked_nvr === 'number' &&
            typeof (entry as UserCourtData).in_worker_pool === 'boolean'
          ) {
            const typedEntry = entry as UserCourtData;
            acc[typedEntry.court] = typedEntry;
          }

          return acc;
        }, {} as Record<string, UserCourtData>);

        setUserCourtState(nextState);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setUserCourtLoadError(error instanceof Error ? error.message : 'Failed to load stakes');
        setUserCourtState({});
      }
    };

    void loadUserCourtData();

    return () => controller.abort();
  }, [account?.address, nivsterMode]);

  const groupedCourts = courts.reduce((acc, court) => {
    const cat = court.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(court);
    return acc;
  }, {} as Record<string, Court[]>);

  const categories = Object.keys(groupedCourts);
  const activeCategory = activeCourtCategory && groupedCourts[activeCourtCategory] ? activeCourtCategory : categories[0] || '';
  const courtsInCategory = groupedCourts[activeCategory] || [];
  const activeCourt = courtsInCategory.find(c => c.court_id === selectedCourtId) || courtsInCategory[0];

  const updateUserCourtData = (courtId: string, updater: (current: UserCourtData) => UserCourtData) => {
    setUserCourtState(prev => ({
      ...prev,
      [courtId]: updater(prev[courtId] ?? createEmptyUserCourtData(courtId)),
    }));
  };

  const userCourtData = activeCourt ? userCourtState[activeCourt.court_id] ?? createEmptyUserCourtData(activeCourt.court_id) : null;
  const isInPool = Boolean(userCourtData?.in_worker_pool);
  const userStakeNvr = userCourtData ? userCourtData.nvr / NVR_DECIMALS : 0;
  const unclaimedSui = userCourtData ? userCourtData.sui / SUI_DECIMALS : 0;
  const lockedNvr = userCourtData ? userCourtData.locked_nvr / NVR_DECIMALS : 0;
  const availableToWithdraw = userCourtData ? Math.max(userCourtData.nvr - userCourtData.locked_nvr, 0) / NVR_DECIMALS : 0;
  const minStakeNvr = activeCourt ? activeCourt.min_stake / NVR_DECIMALS : 0;
  const minimumAdditionalStake = activeCourt && userCourtData
    ? Math.max(activeCourt.min_stake - userCourtData.nvr, 0) / NVR_DECIMALS
    : 25;
  const withdrawableSui = unclaimedSui;
  const canWithdraw = availableToWithdraw > 0 || withdrawableSui > 0;
  const withdrawNvrAmount = Number(withdrawNvrInput);
  const withdrawSuiAmount = Number(withdrawSuiInput);
  const hasValidNvrInput = withdrawNvrInput.trim() !== '' && Number.isFinite(withdrawNvrAmount);
  const hasValidSuiInput = withdrawSuiInput.trim() !== '' && Number.isFinite(withdrawSuiAmount);
  const exceedsNvrWithdrawBalance = hasValidNvrInput && withdrawNvrAmount > availableToWithdraw;
  const exceedsSuiWithdrawBalance = hasValidSuiInput && withdrawSuiAmount > withdrawableSui;
  const remainingStakeAfterWithdraw = hasValidNvrInput
    ? Math.max(userStakeNvr - Math.max(withdrawNvrAmount, 0), 0)
    : userStakeNvr;
  const willExitWorkerPool = hasValidNvrInput
    && isInPool
    && withdrawNvrAmount > 0
    && remainingStakeAfterWithdraw < minStakeNvr;
  const withdrawWarning = exceedsNvrWithdrawBalance
    ? 'This NVR amount exceeds your available NVR balance.'
    : exceedsSuiWithdrawBalance
      ? 'This SUI amount exceeds your available SUI balance.'
    : willExitWorkerPool
      ? `This withdrawal leaves your stake below the ${formatAmount(minStakeNvr)} NVR minimum, so you will exit the worker pool.`
      : null;
  const exceedsWithdrawBalance = exceedsNvrWithdrawBalance || exceedsSuiWithdrawBalance;
  const hasPositiveWithdrawAmount = (hasValidNvrInput && withdrawNvrAmount > 0) || (hasValidSuiInput && withdrawSuiAmount > 0);

  useEffect(() => {
    if (!isStakeDialogOpen) {
      return;
    }

    const loadBalance = async () => {
      if (!account) {
        setAvailableNvrBalance(null);
        return;
      }

      try {
        setIsLoadingNvrBalance(true);

        const balance = await client.core.getBalance({
          owner: account.address,
          coinType: `${networkConfig.nvrPackageId}::nvr::NVR`,
        });

        setAvailableNvrBalance(Number(balance.balance.balance) / NVR_DECIMALS);
      } catch {
        setAvailableNvrBalance(null);
      } finally {
        setIsLoadingNvrBalance(false);
      }
    };

    loadBalance();

    setStakeInput(minimumAdditionalStake > 0 ? String(Math.ceil(minimumAdditionalStake)) : '');
    setStakeError(null);
  }, [isStakeDialogOpen, minimumAdditionalStake, activeCourt?.court_id, account?.address, client, networkConfig.nvrPackageId]);

  useEffect(() => {
    setIsStakeDialogOpen(false);
    setStakeError(null);
    setIsWithdrawDialogOpen(false);
    setWithdrawError(null);
  }, [activeCourt?.court_id]);

  const openStakeDialog = () => {
    if (!activeCourt) return;

    setIsStakeDialogOpen(true);
  };

  const closeStakeDialog = () => {
    setIsStakeDialogOpen(false);
    setStakeError(null);
  };

  const openWithdrawDialog = () => {
    if (!activeCourt) return;

    setWithdrawNvrInput('');
    setWithdrawSuiInput('');
    setWithdrawError(null);
    setIsWithdrawDialogOpen(true);
  };

  const closeWithdrawDialog = () => {
    setIsWithdrawDialogOpen(false);
    setWithdrawError(null);
  };

  const handleStakeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeCourt) return;

    const parsedAmount = Number(stakeInput) * NVR_DECIMALS;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStakeError('Enter a valid NVR amount to stake.');
      return;
    }

    if (availableNvrBalance !== null && Number(stakeInput) > availableNvrBalance) {
      setStakeError('Entered amount exceeds your available NVR balance.');
      return;
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${networkConfig.packageId}::court::stake`,
      arguments: [
        tx.object(activeCourt.court_id),
        tx.object(networkConfig.registryId),
        coinWithBalance({
          balance: BigInt(parsedAmount),
          type: `${networkConfig.nvrPackageId}::nvr::NVR`,
        }),
      ],
    });

    let res = await dAppKit.signAndExecuteTransaction({ transaction: tx });

    if (res.$kind == "Transaction") {
      updateUserCourtData(activeCourt.court_id, current => ({
        ...current,
        nvr: current.nvr + parsedAmount,
      }));
    }

    closeStakeDialog();
  };

  const handleWithdrawSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeCourt || !userCourtData) return;

    const nvrAmount = hasValidNvrInput ? withdrawNvrAmount : 0;
    const suiAmount = hasValidSuiInput ? withdrawSuiAmount : 0;

    if (
      (withdrawNvrInput.trim() !== '' && (!Number.isFinite(withdrawNvrAmount) || withdrawNvrAmount < 0)) ||
      (withdrawSuiInput.trim() !== '' && (!Number.isFinite(withdrawSuiAmount) || withdrawSuiAmount < 0))
    ) {
      setWithdrawError('Enter valid withdrawal amounts.');
      return;
    }

    if (nvrAmount <= 0 && suiAmount <= 0) {
      setWithdrawError('Enter an amount to withdraw for NVR or SUI.');
      return;
    }

    if (nvrAmount > availableToWithdraw || suiAmount > withdrawableSui) {
      setWithdrawError('Entered amount exceeds your available balance.');
      return;
    }

    const tx = new Transaction();

    if (!account) {
      return;
    }

    const [nvr, sui] = tx.moveCall({
      target: `${networkConfig.packageId}::court::withdraw`,
      arguments: [
        tx.object(activeCourt.court_id),
        tx.pure.u64(nvrAmount * NVR_DECIMALS),
        tx.pure.u64(suiAmount * SUI_DECIMALS),
      ],
    });

    tx.transferObjects([nvr], tx.pure.address(account.address));
    tx.transferObjects([sui], tx.pure.address(account.address));

    let res = await dAppKit.signAndExecuteTransaction({ transaction: tx });

    if (res.$kind == "Transaction") {
      updateUserCourtData(activeCourt.court_id, current => ({
        ...current,
        nvr: Math.max(current.locked_nvr, current.nvr - (nvrAmount * NVR_DECIMALS)),
        sui: Math.max(0, current.sui - (suiAmount * SUI_DECIMALS)),
        in_worker_pool: nvrAmount > 0 && isInPool && remainingStakeAfterWithdraw < minStakeNvr
          ? false
          : current.in_worker_pool,
      }));
    }

    closeWithdrawDialog();
  };

  const toggleWorkerpoolStatus = async (currentInWorkerPool: boolean) => {
    if (!activeCourt) return;

    const tx = new Transaction();

    if (currentInWorkerPool) {
      tx.moveCall({
        target: `${networkConfig.packageId}::court::leave_worker_pool`,
        arguments: [
          tx.object(activeCourt.court_id),
        ],
      });
    } else {
      tx.moveCall({
        target: `${networkConfig.packageId}::court::join_worker_pool`,
        arguments: [
          tx.object(activeCourt.court_id),
        ],
      });
    }

    let res = await dAppKit.signAndExecuteTransaction({ transaction: tx });

    if (res.$kind == "Transaction") {
      updateUserCourtData(activeCourt.court_id, current => ({
        ...current,
        in_worker_pool: !currentInWorkerPool,
      }));
    }
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
      {courtLoadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Could not load courts: {courtLoadError}
        </div>
      )}
      {nivsterMode && userCourtLoadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Could not load stake data: {userCourtLoadError}
        </div>
      )}

      {/* Master-Detail Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden border border-[#473a87]/10 rounded-2xl bg-white shadow-sm">
        {/* Sidebar */}
        <div className="w-[31%] border-r border-[#473a87]/10 bg-slate-50 flex flex-col">
          <div className="p-3 border-b border-[#473a87]/5 text-[11px] font-bold text-[#473a87]/40 uppercase tracking-widest bg-slate-100/50">
            {activeCategory} Courts
          </div>
          {courtsInCategory.map(court => {
            const inPool = nivsterMode && userCourtState[court.court_id]?.in_worker_pool;
            return (
              <button
                key={court.court_id}
                onClick={() => setSelectedCourtId(court.court_id)}
                className={`w-full text-left p-4 border-b border-[#473a87]/5 hover:bg-white transition-colors flex flex-col ${activeCourt?.court_id === court.court_id ? 'bg-white border-l-4 border-l-[#473a87]' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h4 className="font-bold text-[#473a87] text-sm leading-tight">{court.name}</h4>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {court.ai_court && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] uppercase tracking-wider font-black rounded-lg">AI Jury</span>
                    )}
                    {nivsterMode && inPool && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] uppercase tracking-wider font-black rounded-lg">Joined</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#473a87]/60 line-clamp-2">{court.description}</p>
              </button>
            );
          })}
          {isLoadingCourts && (
            <div className="p-8 text-center text-[#473a87]/40 font-semibold text-sm">Loading courts...</div>
          )}
          {!isLoadingCourts && courtsInCategory.length === 0 && (
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
                    onClick={() => navigator.clipboard.writeText(activeCourt.court_id)}
                    className="inline-flex items-center px-2.5 py-1 bg-[#473a87]/5 hover:bg-[#473a87]/15 transition-colors text-[#473a87]/60 hover:text-[#473a87] text-[11px] font-mono font-semibold rounded-md cursor-pointer"
                    title="Copy address"
                  >
                    <span>{activeCourt.court_id}</span>
                    <svg className="w-3 h-3 ml-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {activeCourt.ai_court && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] uppercase tracking-wider font-black rounded-lg shrink-0">AI Jury Enabled</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black leading-tight">{activeCourt.name}</h2>
                </div>
                <p className="text-sm font-medium leading-snug pr-2 opacity-80">{activeCourt.description}</p>
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
                        onClick={() => toggleWorkerpoolStatus(Boolean(userCourtData?.in_worker_pool))}
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
                      <p className="text-base font-black text-purple-700">{formatAmount(userStakeNvr)} <span className="text-[10px]">NVR</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-1">SUI</p>
                      <p className="text-base font-black text-blue-600">{formatAmount(unclaimedSui)} <span className="text-[10px]">SUI</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-1">Locked</p>
                      <p className="text-base font-black text-amber-600">{formatAmount(lockedNvr)} <span className="text-[10px]">NVR</span></p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#473a87]/8 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openStakeDialog}
                        className="px-3 py-2 rounded-xl bg-[#473a87] text-white text-[11px] font-black uppercase tracking-wider shadow-sm hover:bg-[#3b306f] transition-colors"
                      >
                        Stake
                      </button>
                      <button
                        onClick={openWithdrawDialog}
                        disabled={!canWithdraw}
                        className={`px-3 py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-colors ${
                          !canWithdraw
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'border-[#473a87]/15 bg-white text-[#473a87] hover:bg-slate-50'
                        }`}
                      >
                        Withdraw
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-[#473a87]/45">
                      Min stake to join: {activeCourt.min_stake / NVR_DECIMALS} NVR
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Timetable Panel */}
                <div className="bg-white border border-[#473a87]/10 rounded-2xl p-3.5 shadow-sm">
                  <h5 className="text-[10px] uppercase tracking-widest font-black text-[#473a87]/50 mb-2 border-b border-[#473a87]/10 pb-2">Timetable Parameters</h5>
                  <ul className="text-xs font-semibold text-[#473a87]">
                    <ParamItem label="Response Period" value={`${activeCourt.response_period_ms / 3600000}h`} explanation="Time allowed for the defendant to respond to the dispute before automatic default." />
                    <ParamItem label="Evidence Period" value={`${activeCourt.evidence_period_ms / 3600000}h`} explanation="Timeframe where both parties can upload supporting documents and files." />
                    <ParamItem label="Voting Period" value={`${activeCourt.voting_period_ms / 3600000}h`} explanation="Duration the selected Nivsters have to deliberate and cast their verdict." />
                    <ParamItem label="Appeal Period" value={`${activeCourt.appeal_period_ms / 3600000}h`} explanation="Window after a verdict where losing parties can escalate the case." />
                  </ul>
                </div>

                {/* Economics Panel */}
                <div className="bg-white border border-[#473a87]/10 rounded-2xl p-3.5 shadow-sm">
                  <h5 className="text-[10px] uppercase tracking-widest font-black text-[#473a87]/50 mb-2 border-b border-[#473a87]/10 pb-2">Economics Rules</h5>
                  <ul className="text-xs font-semibold text-[#473a87]">
                    <ParamItem label="Min Stake" value={<span className="text-purple-700">{activeCourt.min_stake / NVR_DECIMALS} NVR</span>} explanation="The minimum amount of tokens required for a Nivster to join this court's workerpool." />
                    <ParamItem label="Req. Rep" value={`${Math.min(100, Math.max(0, activeCourt.reputation_requirement))}%`} explanation="The minimum reputation score a Nivster must hold to be drawn for cases here." />
                    <ParamItem label="Dispute Fee" value={<span className="text-blue-600">{activeCourt.dispute_fee / 1000000000} SUI</span>} explanation="The baseline cost charged to parties to open a dispute in this jurisdiction." />
                    <ParamItem label="Nivsters Count" value={activeCourt.init_nivster_count} explanation="The number of jurors drawn per standard case in this court." />
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[#473a87]/40 font-semibold">Select a court to view details</div>
          )}
        </div>
      </div>
      {isStakeDialogOpen && activeCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[#473a87]/10 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#473a87]/45">Stake NVR</p>
                <h3 className="mt-1 text-xl font-black text-[#24164b]">{activeCourt.name}</h3>
                <p className="mt-2 text-sm font-medium text-[#473a87]/60">
                  Choose how much NVR you want to add to this court.
                </p>
              </div>
              <button
                type="button"
                onClick={closeStakeDialog}
                className="rounded-full p-2 text-[#473a87]/50 transition-colors hover:bg-slate-100 hover:text-[#473a87]"
                aria-label="Close stake dialog"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleStakeSubmit}>
              <div className="rounded-2xl border border-[#473a87]/10 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#473a87]/60">
                  <span>Current stake</span>
                  <span>{formatAmount(userStakeNvr)} NVR</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-[#473a87]/60">
                  <span>Available balance</span>
                  <span>
                    {isLoadingNvrBalance
                      ? 'Loading...'
                      : availableNvrBalance === null
                        ? 'Unavailable'
                        : `${formatAmount(availableNvrBalance)} NVR`}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-[#473a87]/60">
                  <span>Minimum to join</span>
                  <span>{formatAmount(minStakeNvr)} NVR</span>
                </div>
                {minimumAdditionalStake > 0 && (
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-amber-700">
                    <span>Needed to qualify</span>
                    <span>{formatAmount(minimumAdditionalStake)} NVR</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="stake-amount" className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45">
                  Stake Amount
                </label>
                <div className="flex items-center rounded-2xl border border-[#473a87]/12 bg-slate-50 px-3">
                  <input
                    id="stake-amount"
                    type="number"
                    min="0"
                    step="0.1"
                    value={stakeInput}
                    onChange={event => { setStakeInput(event.target.value); setStakeError(null); }}
                    className="w-full bg-transparent py-3 text-sm font-semibold text-[#24164b] outline-none"
                    placeholder="Enter NVR amount"
                  />
                  <span className="text-xs font-black uppercase tracking-wider text-[#473a87]/40">NVR</span>
                </div>
                {availableNvrBalance !== null && (
                  <p className="mt-2 text-sm font-semibold text-[#473a87]/50">
                    You can stake up to {formatAmount(availableNvrBalance)} NVR.
                  </p>
                )}
                {stakeError && (
                  <p className="mt-2 text-sm font-semibold text-red-600">{stakeError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeStakeDialog}
                  className="rounded-xl border border-[#473a87]/15 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#473a87] transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#473a87] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#3b306f]"
                >
                  Confirm Stake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isWithdrawDialogOpen && activeCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[#473a87]/10 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#473a87]/45">Withdraw Tokens</p>
                <h3 className="mt-1 text-xl font-black text-[#24164b]">{activeCourt.name}</h3>
                <p className="mt-2 text-sm font-medium text-[#473a87]/60">
                  Choose which balance you want to withdraw from this court.
                </p>
              </div>
              <button
                type="button"
                onClick={closeWithdrawDialog}
                className="rounded-full p-2 text-[#473a87]/50 transition-colors hover:bg-slate-100 hover:text-[#473a87]"
                aria-label="Close withdraw dialog"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleWithdrawSubmit}>
              <div className="rounded-2xl border border-[#473a87]/10 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#473a87]/60">
                  <span>Available NVR</span>
                  <span>{formatAmount(availableToWithdraw)} NVR</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-[#473a87]/60">
                  <span>Available SUI</span>
                  <span>{formatAmount(withdrawableSui)} SUI</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-[#473a87]/60">
                  <span>Stake after NVR withdrawal</span>
                  <span>{formatAmount(remainingStakeAfterWithdraw)} NVR</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="withdraw-nvr-amount" className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45">
                    Withdraw NVR
                  </label>
                  <div className="flex items-center rounded-2xl border border-[#473a87]/12 bg-slate-50 px-3">
                    <input
                      id="withdraw-nvr-amount"
                      type="number"
                      min="0"
                      step="0.1"
                      value={withdrawNvrInput}
                      onChange={event => {
                        setWithdrawNvrInput(event.target.value);
                        setWithdrawError(null);
                      }}
                      className="w-full bg-transparent py-3 text-sm font-semibold text-[#24164b] outline-none"
                      placeholder="Enter NVR amount"
                    />
                    <span className="text-xs font-black uppercase tracking-wider text-[#473a87]/40">NVR</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#473a87]/50">
                    You can withdraw up to {formatAmount(availableToWithdraw)} NVR.
                  </p>
                </div>

                <div>
                  <label htmlFor="withdraw-sui-amount" className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45">
                    Withdraw SUI
                  </label>
                  <div className="flex items-center rounded-2xl border border-[#473a87]/12 bg-slate-50 px-3">
                    <input
                      id="withdraw-sui-amount"
                      type="number"
                      min="0"
                      step="0.1"
                      value={withdrawSuiInput}
                      onChange={event => {
                        setWithdrawSuiInput(event.target.value);
                        setWithdrawError(null);
                      }}
                      className="w-full bg-transparent py-3 text-sm font-semibold text-[#24164b] outline-none"
                      placeholder="Enter SUI amount"
                    />
                    <span className="text-xs font-black uppercase tracking-wider text-[#473a87]/40">SUI</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#473a87]/50">
                    You can withdraw up to {formatAmount(withdrawableSui)} SUI.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45">
                  Withdrawal Summary
                </label>
                {withdrawWarning && (
                  <p className={`mt-2 rounded-2xl px-3 py-2 text-sm font-semibold ${
                    exceedsWithdrawBalance
                      ? 'border border-red-200 bg-red-50 text-red-700'
                      : 'border border-amber-200 bg-amber-50 text-amber-800'
                  }`}>
                    {withdrawWarning}
                  </p>
                )}
                {withdrawError && (
                  <p className="mt-2 text-sm font-semibold text-red-600">{withdrawError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeWithdrawDialog}
                  className="rounded-xl border border-[#473a87]/15 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#473a87] transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={exceedsWithdrawBalance || !hasPositiveWithdrawAmount}
                  className={`rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider shadow-sm transition-colors ${
                    exceedsWithdrawBalance || !hasPositiveWithdrawAmount
                      ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                      : 'bg-[#473a87] text-white hover:bg-[#3b306f]'
                  }`}
                >
                  Confirm Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
