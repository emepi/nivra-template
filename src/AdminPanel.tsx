import { useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useEffect, useState } from 'react';
import { useNetworkConfig } from './constants';
import type { Court } from './CourtExplorer';

const COURTS_ENDPOINT = 'http://127.0.0.1:8080/courts';

export default function AdminPanel() {
  const dAppKit = useDAppKit();
  const networkConfig = useNetworkConfig();

  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoadingCourts, setIsLoadingCourts] = useState(true);
  const [courtLoadError, setCourtLoadError] = useState<string | null>(null);
  const [isCreatingCourt, setIsCreatingCourt] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    ai_court: false,
    response_period_ms: '',
    draw_period_ms: '',
    evidence_period_ms: '',
    voting_period_ms: '',
    appeal_period_ms: '',
    min_stake: '',
    reputation_requirement: '',
    init_nivster_count: '',
    sanction_model: '',
    coefficient: '',
    dispute_fee: '',
    treasury_share: '',
    treasury_share_nvr: '',
    empty_vote_penalty: '',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    description: '',
    ai_court: false,
    response_period_ms: '',
    draw_period_ms: '',
    evidence_period_ms: '',
    voting_period_ms: '',
    appeal_period_ms: '',
    min_stake: '',
    reputation_requirement: '',
    init_nivster_count: '',
    sanction_model: '',
    coefficient: '',
    dispute_fee: '',
    treasury_share: '',
    treasury_share_nvr: '',
    empty_vote_penalty: '',
  });

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

    loadCourts();

    return () => controller.abort();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setEditFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const startEditing = (court: Court) => {
    setEditingCourt(court);
    setEditFormData({
      name: court.name,
      category: court.category,
      description: court.description,
      ai_court: court.ai_court,
      response_period_ms: String(court.response_period_ms),
      draw_period_ms: String(court.draw_period_ms),
      evidence_period_ms: String(court.evidence_period_ms),
      voting_period_ms: String(court.voting_period_ms),
      appeal_period_ms: String(court.appeal_period_ms),
      min_stake: String(court.min_stake),
      reputation_requirement: String(court.reputation_requirement),
      init_nivster_count: String(court.init_nivster_count),
      sanction_model: String(court.sanction_model),
      coefficient: String(court.coefficient),
      dispute_fee: String(court.dispute_fee),
      treasury_share: String(court.treasury_share),
      treasury_share_nvr: String(court.treasury_share_nvr),
      empty_vote_penalty: String(court.empty_vote_penalty),
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCourt?.court_id) {
      return;
    }

    const tx = new Transaction();

    const metadata = tx.moveCall({
      target: `${networkConfig.packageId}::court::create_metadata`,
      arguments: [
        tx.pure.string(editFormData.name),
        tx.pure.string(editFormData.category),
        tx.pure.string(editFormData.description),
        tx.pure.bool(editFormData.ai_court),
      ],
    });

    const timetable = tx.moveCall({
      target: `${networkConfig.packageId}::court::create_timetable`,
      arguments: [
        tx.pure.u64(editFormData.response_period_ms),
        tx.pure.u64(editFormData.draw_period_ms),
        tx.pure.u64(editFormData.evidence_period_ms),
        tx.pure.u64(editFormData.voting_period_ms),
        tx.pure.u64(editFormData.appeal_period_ms),
      ],
    });

    const economics = tx.moveCall({
      target: `${networkConfig.packageId}::court::create_economics`,
      arguments: [
        tx.pure.u64(editFormData.min_stake),
        tx.pure.u64(editFormData.reputation_requirement),
        tx.pure.u64(editFormData.init_nivster_count),
        tx.pure.u64(editFormData.sanction_model),
        tx.pure.u64(editFormData.coefficient),
        tx.pure.u64(editFormData.dispute_fee),
        tx.pure.u64(editFormData.treasury_share),
        tx.pure.u64(editFormData.treasury_share_nvr),
        tx.pure.u64(editFormData.empty_vote_penalty),
      ],
    });

    tx.moveCall({
      target: `${networkConfig.packageId}::court::change_metadata`,
      arguments: [
        tx.object(editingCourt.court_id),
        tx.object(networkConfig.registryId),
        metadata,
      ],
    });

    tx.moveCall({
      target: `${networkConfig.packageId}::court::change_timetable`,
      arguments: [
        tx.object(editingCourt.court_id),
        tx.object(networkConfig.registryId),
        timetable,
      ],
    });

    tx.moveCall({
      target: `${networkConfig.packageId}::court::change_economics`,
      arguments: [
        tx.object(editingCourt.court_id),
        tx.object(networkConfig.registryId),
        economics,
      ],
    });

    const result = await dAppKit.signAndExecuteTransaction({
      transaction: tx,
    });

    console.log("Edit court result:", result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting court data:", formData);

    const tx = new Transaction();

    const metadata = tx.moveCall({
      target: `${networkConfig.packageId}::court::create_metadata`,
      arguments: [
        tx.pure.string(formData.name),
        tx.pure.string(formData.category),
        tx.pure.string(formData.description),
        tx.pure.bool(formData.ai_court),
      ],
    });

    const timetable = tx.moveCall({
      target: `${networkConfig.packageId}::court::create_timetable`,
      arguments: [
        tx.pure.u64(formData.response_period_ms),
        tx.pure.u64(formData.draw_period_ms),
        tx.pure.u64(formData.evidence_period_ms),
        tx.pure.u64(formData.voting_period_ms),
        tx.pure.u64(formData.appeal_period_ms),
      ],
    });

    const economics = tx.moveCall({
      target: `${networkConfig.packageId}::court::create_economics`,
      arguments: [
        tx.pure.u64(formData.min_stake),
        tx.pure.u64(formData.reputation_requirement),
        tx.pure.u64(formData.init_nivster_count),
        tx.pure.u64(formData.sanction_model),
        tx.pure.u64(formData.coefficient),
        tx.pure.u64(formData.dispute_fee),
        tx.pure.u64(formData.treasury_share),
        tx.pure.u64(formData.treasury_share_nvr),
        tx.pure.u64(formData.empty_vote_penalty),
      ],
    });

    const operation = tx.moveCall({
      target: `${networkConfig.packageId}::court::create_operation`,
      arguments: [
        tx.pure.u8(0),
        tx.pure('vector<address>', networkConfig.sealKeyServers),
        tx.pure('vector<vector<u8>>', networkConfig.sealPublicKeys),
        tx.pure.u8(1),
      ],
    });

    tx.moveCall({
      target: `${networkConfig.packageId}::court::create_court`,
      arguments: [
        tx.object(networkConfig.registryId),
        metadata,
        timetable,
        economics,
        operation,
      ],
    });

    let res = await dAppKit.signAndExecuteTransaction({ transaction: tx });

    console.log(res);
  };

  const inputClass = "w-full px-4 py-2 mt-1 rounded-xl bg-white border border-[#473a87]/20 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium transition-all shadow-sm";
  const labelClass = "block text-xs font-bold text-[#473a87]/70 uppercase tracking-wider mb-1";
  const sectionClass = "bg-slate-50 border border-[#473a87]/10 rounded-2xl p-6 transition-all hover:shadow-md";

  // ── Editing a court ──
  if (editingCourt) {
    return (
      <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 text-[#473a87]">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black mb-2">Edit Court</h2>
              <p className="text-[#473a87]/60 font-medium">
                Editing <span className="font-bold text-[#473a87]">{editingCourt.name}</span>
                <span className="ml-2 text-xs font-mono text-[#473a87]/40">({editingCourt.court_id.slice(0, 10)}…)</span>
              </p>
            </div>
            <button
              onClick={() => setEditingCourt(null)}
              className="text-[#473a87]/70 hover:text-[#473a87] font-bold px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-8">
            {/* Metadata */}
            <div className={sectionClass}>
              <div className="flex items-center mb-6 border-b border-[#473a87]/10 pb-4">
                <h3 className="text-xl font-bold">Metadata</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Name</label>
                  <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <input type="text" name="category" value={editFormData.category} onChange={handleEditChange} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea name="description" value={editFormData.description} onChange={handleEditChange} className={`${inputClass} resize-none min-h-[100px]`} />
                </div>
                <div className="flex items-center space-x-3 mt-2">
                  <input type="checkbox" id="edit_ai_court" name="ai_court" checked={editFormData.ai_court} onChange={handleEditChange} className="w-5 h-5 rounded border-[#473a87]/30 text-[#473a87] focus:ring-[#473a87]" />
                  <label htmlFor="edit_ai_court" className="text-sm font-bold cursor-pointer select-none">Enable AI Jury (AI Court)</label>
                </div>
              </div>
            </div>

            {/* Timetable */}
            <div className={sectionClass}>
              <div className="flex items-center mb-6 border-b border-[#473a87]/10 pb-4">
                <h3 className="text-xl font-bold">Timetable (ms)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Response Period</label>
                  <input type="number" name="response_period_ms" value={editFormData.response_period_ms} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Draw Period</label>
                  <input type="number" name="draw_period_ms" value={editFormData.draw_period_ms} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Evidence Period</label>
                  <input type="number" name="evidence_period_ms" value={editFormData.evidence_period_ms} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Voting Period</label>
                  <input type="number" name="voting_period_ms" value={editFormData.voting_period_ms} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Appeal Period</label>
                  <input type="number" name="appeal_period_ms" value={editFormData.appeal_period_ms} onChange={handleEditChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Economics */}
            <div className={sectionClass}>
              <div className="flex items-center mb-6 border-b border-[#473a87]/10 pb-4">
                <h3 className="text-xl font-bold">Economics</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Min Stake</label>
                  <input type="number" name="min_stake" value={editFormData.min_stake} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Reputation Requirement</label>
                  <input type="number" name="reputation_requirement" value={editFormData.reputation_requirement} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Initial Nivster Count</label>
                  <input type="number" name="init_nivster_count" value={editFormData.init_nivster_count} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Sanction Model</label>
                  <input type="number" name="sanction_model" value={editFormData.sanction_model} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Coefficient</label>
                  <input type="number" name="coefficient" value={editFormData.coefficient} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Dispute Fee</label>
                  <input type="number" name="dispute_fee" value={editFormData.dispute_fee} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Treasury Share</label>
                  <input type="number" name="treasury_share" value={editFormData.treasury_share} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Treasury Share NVR</label>
                  <input type="number" name="treasury_share_nvr" value={editFormData.treasury_share_nvr} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Empty Vote Penalty</label>
                  <input type="number" name="empty_vote_penalty" value={editFormData.empty_vote_penalty} onChange={handleEditChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-8 py-4 bg-[#473a87] text-white font-bold rounded-xl shadow-md hover:bg-[#382d6b] hover:shadow-lg transition-all focus:ring-4 focus:ring-[#473a87]/30"
              >
                Submit Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 text-[#473a87]">
      {isCreatingCourt ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black mb-2">Create New Court</h2>
              <p className="text-[#473a87]/60 font-medium">Configure metadata, timetable, and economics.</p>
            </div>
            <button
              onClick={() => setIsCreatingCourt(false)}
              className="text-[#473a87]/70 hover:text-[#473a87] font-bold px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Metadata Section */}
            <div className={sectionClass}>
              <div className="flex items-center mb-6 border-b border-[#473a87]/10 pb-4">
                <h3 className="text-xl font-bold">Metadata</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} placeholder="e.g. Freelance Disputes" />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleChange} className={inputClass} placeholder="e.g. Services" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} className={`${inputClass} resize-none min-h-[100px]`} placeholder="Describe the purpose of this court..." />
                </div>
                <div className="flex items-center space-x-3 mt-2">
                  <input type="checkbox" id="ai_court" name="ai_court" checked={formData.ai_court} onChange={handleChange} className="w-5 h-5 rounded border-[#473a87]/30 text-[#473a87] focus:ring-[#473a87]" />
                  <label htmlFor="ai_court" className="text-sm font-bold cursor-pointer select-none">Enable AI Jury (AI Court)</label>
                </div>
              </div>
            </div>

            {/* Timetable Section */}
            <div className={sectionClass}>
              <div className="flex items-center mb-6 border-b border-[#473a87]/10 pb-4">
                <h3 className="text-xl font-bold">Timetable (ms)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Response Period</label>
                  <input type="number" name="response_period_ms" value={formData.response_period_ms} onChange={handleChange} className={inputClass} placeholder="e.g. 86400000" />
                </div>
                <div>
                  <label className={labelClass}>Draw Period</label>
                  <input type="number" name="draw_period_ms" value={formData.draw_period_ms} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Evidence Period</label>
                  <input type="number" name="evidence_period_ms" value={formData.evidence_period_ms} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Voting Period</label>
                  <input type="number" name="voting_period_ms" value={formData.voting_period_ms} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Appeal Period</label>
                  <input type="number" name="appeal_period_ms" value={formData.appeal_period_ms} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Economics Section */}
            <div className={sectionClass}>
              <div className="flex items-center mb-6 border-b border-[#473a87]/10 pb-4">
                <h3 className="text-xl font-bold">Economics</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Min Stake</label>
                  <input type="number" name="min_stake" value={formData.min_stake} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Reputation Requirement</label>
                  <input type="number" name="reputation_requirement" value={formData.reputation_requirement} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Initial Nivster Count</label>
                  <input type="number" name="init_nivster_count" value={formData.init_nivster_count} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Sanction Model</label>
                  <input type="number" name="sanction_model" value={formData.sanction_model} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Coefficient</label>
                  <input type="number" name="coefficient" value={formData.coefficient} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Dispute Fee</label>
                  <input type="number" name="dispute_fee" value={formData.dispute_fee} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Treasury Share</label>
                  <input type="number" name="treasury_share" value={formData.treasury_share} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Treasury Share NVR</label>
                  <input type="number" name="treasury_share_nvr" value={formData.treasury_share_nvr} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Empty Vote Penalty</label>
                  <input type="number" name="empty_vote_penalty" value={formData.empty_vote_penalty} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Submission */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-8 py-4 bg-[#473a87] text-white font-bold rounded-xl shadow-md hover:bg-[#382d6b] hover:shadow-lg transition-all focus:ring-4 focus:ring-[#473a87]/30"
              >
                Create Court
              </button>
            </div>

          </form>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black mb-2">Admin Dashboard</h2>
              <p className="text-[#473a87]/60 font-medium">Manage courts and admin settings.</p>
            </div>
            <button
              onClick={() => setIsCreatingCourt(true)}
              className="px-6 py-3 bg-[#473a87] text-white font-bold rounded-xl shadow-md hover:bg-[#382d6b] hover:shadow-lg transition-all focus:ring-4 focus:ring-[#473a87]/30"
            >
              + Create Court
            </button>
          </div>

          {courtLoadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Could not load courts: {courtLoadError}
            </div>
          )}

          {isLoadingCourts ? (
            <div className="flex items-center justify-center p-16 text-[#473a87]/40 font-semibold">Loading courts…</div>
          ) : courts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-[#473a87]/40 space-y-3">
              <p className="font-semibold">No courts found.</p>
            </div>
          ) : (
            <div className={`${sectionClass} p-0 overflow-hidden`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#473a87]/10 bg-slate-100/60">
                    <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#473a87]/50">ID</th>
                    <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#473a87]/50">Name</th>
                    <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#473a87]/50">Description</th>
                    <th className="px-5 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {courts.map(court => (
                    <tr key={court.court_id} className="border-b border-[#473a87]/5 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-[#473a87]/60 max-w-[140px] truncate" title={court.court_id}>
                        {court.court_id.slice(0, 10)}…
                      </td>
                      <td className="px-5 py-3 font-bold text-[#473a87]">{court.name}</td>
                      <td className="px-5 py-3 text-[#473a87]/70 max-w-[320px] truncate" title={court.description}>
                        {court.description}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => startEditing(court)}
                          className="px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg border border-[#473a87]/15 text-[#473a87] hover:bg-[#473a87] hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
