import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { bcs } from "@mysten/sui/bcs";
import { useState } from "react";
import { Scale, Coins } from "lucide-react";
import { coinWithBalance, type Transaction } from "@mysten/sui/transactions";
import { useNetworkConfig } from "../constants";
import { dAppKit } from "../dapp-kit";

const NivraConfiguration = bcs.struct('NivraConfiguration', {
    court: bcs.Address,
    options: bcs.map(bcs.string(), bcs.Address),
    max_appeals: bcs.u8(),
    file_hashes: bcs.vector(bcs.vector(bcs.u8())),
    hashing_algorithm: bcs.u64()
});

type NivraConfiguration = {
    court: string;
    options: string[];
    parties: string[];
    max_appeals: number;
}

type CourtOverview = {
    status: number,
    name: string,
    ai_court: boolean,
    response_period_ms: number,
    evidence_period_ms: number,
    voting_period_ms: number,
    appeal_period_ms: number,
    init_nivster_count: number,
    dispute_fee: number,
    worker_pool_count: number,
}

const OVERVIEW_ENDPOINT = 'http://127.0.0.1:8080/court_overview';

export const DisputeButton = ({ arbitrableContractId, openingTx }: { arbitrableContractId: string, openingTx: Transaction }) => {
    const client = useCurrentClient();
    const account = useCurrentAccount();
    const networkConfig = useNetworkConfig();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [description, setDescription] = useState("");
    const [nivraConfiguration, setNivraConfiguration] = useState<NivraConfiguration | null>(null);
    const [disputeData, setDisputeData] = useState<CourtOverview | null>(null);

    const loadNivraConfig = async () => {
        const config = await client.getDynamicField({
            parentId: arbitrableContractId,
            name: {
                type: "vector<u8>",
                bcs: bcs.vector(bcs.u8()).serialize(new TextEncoder().encode("nivra_key")).toBytes(),
            },
        });

        let configBcs = config.dynamicField.value.bcs;
        let parsedConfig = NivraConfiguration.parse(configBcs);

        let configuration = {
            court: parsedConfig.court,
            options: Array.from(parsedConfig.options.keys()),
            parties: Array.from(parsedConfig.options.values()),
            max_appeals: parsedConfig.max_appeals,
        } as NivraConfiguration;

        return configuration;
    }

    const handleOpen = async () => {
        setIsOpen(true);
        setIsLoading(true);
        let nivraConfiguration = await loadNivraConfig();
        const response = await fetch(`${OVERVIEW_ENDPOINT}/${nivraConfiguration.court}`);
        let data = await response.json();
        setDisputeData(data as CourtOverview);
        setNivraConfiguration(nivraConfiguration);
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nivraConfiguration || !disputeData) {
            return;
        }

        openingTx.moveCall({
            target: `${networkConfig.packageId}::court::open_dispute`,
            arguments: [
                openingTx.object(nivraConfiguration.court),
                coinWithBalance({
                    balance: BigInt(disputeData.dispute_fee),
                }),
                openingTx.pure.id(arbitrableContractId),
                openingTx.pure.string(description),
                openingTx.pure.vector('string', nivraConfiguration.options),
                openingTx.pure.vector('address', nivraConfiguration.parties),
                openingTx.pure.u8(nivraConfiguration.max_appeals),
                openingTx.object.clock(),
            ],
        });

        let res = await dAppKit.signAndExecuteTransaction({ transaction: openingTx });

        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={handleOpen}
                className="rounded-xl bg-[#473a87] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#3b306f]"
            >
                Open Dispute
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
                    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-xl font-bold text-gray-700">Open Dispute</h3>
                                <p className="text-[12px] font-medium text-gray-500 mt-1">Submit a dispute case for blockchain arbitration</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="py-12 text-center text-gray-400 font-semibold text-lg animate-pulse">
                                Loading configuration...
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {/* Description */}
                                <div className="mb-2">
                                    <label className="block text-[12px] font-bold text-slate-800 mb-2.5">Dispute Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full p-4 rounded-xl bg-slate-50/50 border border-slate-200/60 focus:bg-white focus:ring-2 focus:ring-slate-200/80 focus:border-slate-300 text-slate-700 text-[12px] font-medium resize-none min-h-[80px] transition-all"
                                        placeholder="Describe the nature of the dispute..."
                                        required
                                    />
                                </div>

                                {/* Options */}
                                {nivraConfiguration && nivraConfiguration.options.length > 0 && (() => {
                                    const plaintiffOptions: any[] = [];
                                    const defendantOptions: any[] = [];

                                    nivraConfiguration.options.forEach((opt, i) => {
                                        const isPlaintiff = nivraConfiguration.parties[i] === account?.address;
                                        const item = {
                                            opt,
                                            partyLabel: isPlaintiff ? 'Plaintiff (you)' : 'Defendant',
                                        };
                                        if (isPlaintiff) plaintiffOptions.push(item);
                                        else defendantOptions.push(item);
                                    });

                                    return (
                                        <div className="mb-2">
                                            <label className="block text-[12px] font-bold text-slate-800 mb-2.5">Available Vote Options</label>
                                            <div className="grid grid-cols-2 rounded-xl border border-slate-200/80 overflow-hidden relative bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                                                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-100"></div>

                                                <div className="flex flex-col">
                                                    {plaintiffOptions.map((item, i) => (
                                                        <div key={`p-${i}`} className="px-4 py-2 flex items-center gap-3 transition-colors hover:bg-slate-50/40">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 shadow-sm"></div>
                                                            <div>
                                                                <div className="text-[12px] font-bold text-slate-800 leading-snug">{item.opt}</div>
                                                                <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5">{item.partyLabel}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex flex-col">
                                                    {defendantOptions.map((item, i) => (
                                                        <div key={`d-${i}`} className="px-4 py-2 flex items-center gap-3 transition-colors hover:bg-slate-50/40">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 shadow-sm"></div>
                                                            <div>
                                                                <div className="text-[12px] font-bold text-slate-800 leading-snug">{item.opt}</div>
                                                                <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5">{item.partyLabel}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Fee */}
                                {disputeData && (
                                    <div className="mb-2">
                                        <div className="flex items-center justify-between bg-slate-50/50 border border-slate-200/60 rounded-xl p-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center gap-3">
                                                <Coins className="size-4 text-primary shrink-0" />
                                                <div>
                                                    <div className="text-[12px] font-bold text-slate-800">Opening Fee</div>
                                                    <div className="text-[10px] font-medium text-slate-500 mt-0.5">Winner will be refunded</div>
                                                </div>
                                            </div>
                                            <div className="text-[12px] font-bold text-slate-900">{disputeData.dispute_fee / 1_000_000_000} SUI</div>
                                        </div>
                                    </div>
                                )}

                                <hr className="my-2 border-slate-100" />

                                <div className="flex flex-col gap-5">
                                    {disputeData && nivraConfiguration && (() => {
                                        const lowerBound = disputeData.response_period_ms + disputeData.evidence_period_ms + disputeData.voting_period_ms;
                                        const UpperBound = (disputeData.response_period_ms + disputeData.evidence_period_ms + disputeData.voting_period_ms + disputeData.appeal_period_ms) * (nivraConfiguration.max_appeals + 1);
                                        const daysLowerBound = Math.ceil(lowerBound / (1000 * 60 * 60 * 24));
                                        const daysUpperBound = Math.ceil(UpperBound / (1000 * 60 * 60 * 24));
                                        return (
                                            <div className="flex items-center justify-between text-[11px]">
                                                <div className="flex items-center">
                                                    <Scale className="size-3.5 opacity-60 shrink-0 mr-1.5" />
                                                    <span className="text-slate-500 font-medium mr-1.5">Court:</span>
                                                    <span className="font-bold text-slate-800">{disputeData.name}</span>
                                                </div>
                                                <span className="text-slate-400 font-medium tracking-wide">Avg. {daysLowerBound}-{daysUpperBound} days</span>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex items-center justify-end gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setIsOpen(false)}
                                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="rounded-xl bg-[#473a87] px-5 py-2.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#3b306f]"
                                        >
                                            Submit Dispute
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};