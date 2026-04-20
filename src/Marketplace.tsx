import { useEffect, useState } from 'react';
import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { useNetworkConfig } from './constants';
import { coinWithBalance, Transaction } from '@mysten/sui/transactions';
import { dAppKit } from './dapp-kit';
import { DisputeButton } from './components/DisputeButton';

type MarketplaceTab = 'all' | 'my_listings' | 'my_orders';

export type Listing = {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  stock: number;
  price_sui: number;
  seller: string;
  order_queue: Order[];
};

export type Order = {
  id: string;
  status: String,
  buyer: string;
  description: string;
  quantity: number;
  funds: string;
  last_updated: String;
};

type UserOrder = {
  id: string;
  listing_id: string;
  listing_title: string;
  status: String;
  buyer: string;
  description: string;
  quantity: number;
  funds: string;
  last_updated: String;
}

type MarketplaceData = {
  id: string,
  listings: string[],
};

const SUI_DECIMALS = 1_000_000_000;

const formatSui = (raw: number) => {
  const val = raw / SUI_DECIMALS;
  return Number.isInteger(val) ? val.toString() : val.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
};

const truncateAddress = (addr: string) =>
  addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;

export default function Marketplace() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const networkConfig = useNetworkConfig();
  const [activeTab, setActiveTab] = useState<MarketplaceTab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceData | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedUserOrderId, setExpandedUserOrderId] = useState<string | null>(null);
  const [fulfillForm, setFulfillForm] = useState<{ description: string; urls: string[] }>({ description: '', urls: [''] });
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ description: '', quantity: '1' });
  const [isNewListingOpen, setIsNewListingOpen] = useState(false);
  const [newListingForm, setNewListingForm] = useState({
    title: '',
    description: '',
    category: '',
    picture_url: '',
    price: '',
    quantity: '',
  });

  const openingTx = (listingId: string, orderId: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${networkConfig.marketplacePackageId}::listing::dispute_lock`,
      arguments: [
        tx.object(listingId),
        tx.pure.id(orderId),
        tx.object.clock(),
      ],
    });

    return tx;
  }

  const handleNewListingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewListingForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNewListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tx = new Transaction();

    tx.moveCall({
      target: `${networkConfig.marketplacePackageId}::listing::new`,
      arguments: [
        tx.object(networkConfig.marketplaceId),
        tx.pure.string(newListingForm.title),
        tx.pure.string(newListingForm.description),
        tx.pure.u8(parseInt(newListingForm.category)),
        tx.pure.option('string', newListingForm.picture_url),
        tx.pure.u64(newListingForm.price),
        tx.pure.u64(newListingForm.quantity),
      ],
    });

    let res = await dAppKit.signAndExecuteTransaction({ transaction: tx });

    console.log(res);
  };

  const handlePurchaseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPurchaseForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: implement purchase transaction
    console.log('Purchase submit:', selectedListing?.id, purchaseForm);

    if (!selectedListing?.id) {
      return;
    }

    let total_price = BigInt(Number(purchaseForm.quantity) * selectedListing.price_sui);

    const tx = new Transaction();

    tx.moveCall({
      target: `${networkConfig.marketplacePackageId}::listing::order`,
      arguments: [
        tx.object(selectedListing.id),
        tx.pure.u64(purchaseForm.quantity),
        coinWithBalance({
          balance: total_price,
        }),
        tx.pure.string(purchaseForm.description),
        tx.object.clock(),
      ],
    });

    let res = await dAppKit.signAndExecuteTransaction({ transaction: tx });

    if (res.$kind == "Transaction") {
      setIsPurchaseOpen(false);
      setPurchaseForm({ description: '', quantity: '1' });

      const controller = new AbortController();
      load(controller);
    }
  };

  const openListing = (listing: Listing) => {
    setSelectedListing(listing);
    setPendingOrders(Array.isArray(listing.order_queue) ? listing.order_queue : Object.values(listing.order_queue));
    setExpandedOrderId(null);
    setIsPurchaseOpen(false);
    setPurchaseForm({ description: '', quantity: '1' });
  };

  const handleFulfillSubmit = async (e: React.FormEvent, orderId: string) => {
    e.preventDefault();

    if (!selectedListing?.id) {
      return;
    }

    const tx = new Transaction();

    // deliver(listing: &mut Listing, order_id: ID, urls: vector<String>, attachments: vector<vector<u8>>, description: String, clock: &Clock)
    tx.moveCall({
      target: `${networkConfig.marketplacePackageId}::listing::deliver`,
      arguments: [
        tx.object(selectedListing.id),
        tx.pure.id(orderId),
        tx.pure.vector('string', fulfillForm.urls.filter(u => u.trim() !== '')),
        tx.pure.vector('vector<u8>', []), // empty attachments
        tx.pure.string(fulfillForm.description),
        tx.object.clock(),
      ],
    });

    let res = await dAppKit.signAndExecuteTransaction({ transaction: tx });

    if (res.$kind === "Transaction") {
      setExpandedOrderId(null);
      setFulfillForm({ description: '', urls: [''] });

      const controller = new AbortController();
      load(controller);
    }
  };

  const load = async (controller: AbortController) => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const marketplace = await client.getObject({
        objectId: networkConfig.marketplaceId,
        include: { json: true } as any,
      });

      if (!marketplace.object?.json) {
        throw new Error('Failed to load marketplace');
      };

      const marketplace_data = marketplace.object.json as MarketplaceData;
      setMarketplace(marketplace_data);

      const listings = await client.getObjects({
        objectIds: marketplace_data.listings,
        include: { json: true } as any,
      });

      console.log(listings);

      const listings_data = listings.objects.map(l => {
        let data = (l as any).json;

        return {
          id: data.id,
          title: data.title,
          description: data.description,
          image_url: data.picture,
          price_sui: data.price,
          stock: data.quantity,
          seller: data.seller,
          order_queue: data.order_queue.map((o: any) => {
            return {
              id: o.id,
              status: typeof o.status === 'object' && o.status !== null ? (o.status['@variant'] ?? String(o.status)) : String(o.status),
              buyer: o.buyer,
              description: o.description,
              quantity: o.quantity,
              funds: o.funds,
              last_updated: o.last_updated,
            } as Order;
          }),
        } as Listing;
      });

      if (!Array.isArray(listings_data)) {
        throw new Error('Listings response was not an array');
      }

      setListings(listings_data);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLoadError(error instanceof Error ? error.message : 'Failed to load listings');
      setListings([]);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    load(controller);
    return () => controller.abort();
  }, []);

  const myListings = listings.filter(l => l.seller === account?.address);
  const userOrders: UserOrder[] = listings.flatMap(l => {
    const queue = Array.isArray(l.order_queue) ? l.order_queue : (Object.values(l.order_queue) as Order[]);
    return queue
      .filter(o => o.buyer === account?.address)
      .map(o => ({ ...o, listing_id: l.id, listing_title: l.title } as UserOrder));
  });

  const displayedListings = activeTab === 'my_listings' ? myListings : listings;

  const tabs: { key: MarketplaceTab; label: string }[] = [
    { key: 'all', label: 'All Listings' },
    { key: 'my_listings', label: 'My Listings' },
    { key: 'my_orders', label: 'My Orders' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 text-[#473a87]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-black mb-1">Marketplace</h2>
          <p className="text-[#473a87]/60 font-medium">Browse, list, and manage goods & services.</p>
        </div>
        <button
          onClick={() => { setNewListingForm({ title: '', description: '', category: '', picture_url: '', price: '', quantity: '' }); setIsNewListingOpen(true); }}
          className="px-6 py-3 bg-[#473a87] text-white font-bold rounded-xl shadow-md hover:bg-[#382d6b] hover:shadow-lg transition-all focus:ring-4 focus:ring-[#473a87]/30"
        >
          + New Listing
        </button>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-2 border-b border-[#473a87]/10 pb-0 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-bold transition-all rounded-t-xl -mb-[1px] border border-b-0 ${activeTab === tab.key
              ? 'bg-white border-[#473a87]/10 text-[#473a87] shadow-sm'
              : 'border-transparent text-[#473a87]/45 hover:text-[#473a87]/70 hover:bg-slate-50'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 mb-6">
          Could not load listings: {loadError}
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'my_orders' ? (
        isLoading ? (
          <div className="flex items-center justify-center p-16 text-[#473a87]/40 font-semibold">Loading orders…</div>
        ) : userOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-[#473a87]/40 space-y-3">
            <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-semibold">No orders yet.</p>
            <p className="text-sm">Your purchase history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userOrders.map(order => {
              const isExpanded = expandedUserOrderId === order.id;
              return (
                <div key={order.id} className="bg-slate-50 border border-[#473a87]/10 rounded-xl overflow-hidden">
                  {/* Collapsed row */}
                  <button
                    onClick={() => setExpandedUserOrderId(isExpanded ? null : order.id)}
                    className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-[#473a87]/50">{order.listing_title}</span>
                      <span className="text-sm font-semibold text-[#473a87]/80 truncate max-w-[280px]" title={order.description}>{order.description}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-sm font-bold text-[#473a87]">×{order.quantity}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700">{order.status}</span>
                      <svg className={`w-4 h-4 text-[#473a87]/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-[#473a87]/5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                          <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-0.5">Listing Title</p>
                          <p className="text-xs font-semibold text-[#473a87]/70 truncate">{order.listing_title}</p>
                        </div>
                        <div className="col-span-1">
                          <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-0.5">Last Updated</p>
                          <p className="text-xs font-medium text-[#473a87]/60">{new Date(Number(order.last_updated)).toLocaleString()}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-0.5">Description</p>
                          <p className="text-sm font-medium text-[#473a87] bg-white p-3 rounded-lg border border-[#473a87]/5">{order.description}</p>
                        </div>
                      </div>

                      {order.status != "Disputed" && (
                        <div className="flex justify-end pt-2 border-t border-[#473a87]/5">
                          <DisputeButton arbitrableContractId={order.id} openingTx={openingTx(order.listing_id, order.id)} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : isLoading ? (
        <div className="flex items-center justify-center p-16 text-[#473a87]/40 font-semibold">Loading listings…</div>
      ) : displayedListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-[#473a87]/40 space-y-3">
          <p className="font-semibold">
            {activeTab === 'my_listings' ? 'You have no listings.' : 'No listings found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedListings.map(listing => (
            <button
              key={listing.id}
              onClick={() => openListing(listing)}
              className="bg-white border border-[#473a87]/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col text-left cursor-pointer"
            >
              {/* Image */}
              {listing.image_url ? (
                <div className="w-full h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-28 bg-gradient-to-br from-[#473a87]/5 to-[#473a87]/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#473a87]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}

              {/* Body */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-[#473a87] text-base mb-1 leading-tight">{listing.title}</h3>
                <p className="text-xs text-[#473a87]/60 mb-3 line-clamp-2 flex-1">{listing.description}</p>

                {/* Meta row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-lg font-black text-blue-600">
                    {formatSui(listing.price_sui)} <span className="text-[10px] font-bold uppercase tracking-wider">SUI</span>
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${listing.stock > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
                    }`}>
                    {listing.stock > 0 ? `${listing.stock} in stock` : 'Out of stock'}
                  </span>
                </div>

                {/* Seller */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#473a87]/5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#473a87]/20 to-[#473a87]/40 flex-shrink-0" />
                  <span
                    className="text-[11px] font-mono font-semibold text-[#473a87]/50 truncate cursor-help"
                    title={listing.seller}
                  >
                    {truncateAddress(listing.seller)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New Listing Dialog */}
      {isNewListingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[#473a87]/10 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#473a87]/45">Create</p>
                <h3 className="mt-1 text-xl font-black text-[#24164b]">New Listing</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewListingOpen(false)}
                className="rounded-full p-2 text-[#473a87]/50 transition-colors hover:bg-slate-100 hover:text-[#473a87]"
                aria-label="Close dialog"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleNewListingSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">Title</label>
                <input
                  type="text" name="title" value={newListingForm.title} onChange={handleNewListingChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-[#473a87]/12 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium text-sm"
                  placeholder="e.g. Logo Design Service"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">Description</label>
                <textarea
                  name="description" value={newListingForm.description} onChange={handleNewListingChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-[#473a87]/12 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium text-sm resize-none min-h-[80px]"
                  placeholder="Describe your listing…"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">Category</label>
                  <select
                    name="category" value={newListingForm.category} onChange={handleNewListingChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-[#473a87]/12 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium text-sm"
                  >
                    <option value="" disabled>Select category</option>
                    <option value="0">service</option>
                    <option value="1">e-commerce</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">Picture URL <span className="text-[#473a87]/30">(optional)</span></label>
                  <input
                    type="text" name="picture_url" value={newListingForm.picture_url} onChange={handleNewListingChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-[#473a87]/12 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium text-sm"
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">Price</label>
                  <div className="flex items-center rounded-xl border border-[#473a87]/12 bg-slate-50 px-3">
                    <input
                      type="number" name="price" min="0" value={newListingForm.price} onChange={handleNewListingChange}
                      className="w-full bg-transparent py-2.5 text-sm font-semibold text-[#24164b] outline-none"
                      placeholder="0"
                    />
                    <span className="text-xs font-black uppercase tracking-wider text-[#473a87]/40">MIST</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">Quantity</label>
                  <input
                    type="number" name="quantity" min="1" value={newListingForm.quantity} onChange={handleNewListingChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-[#473a87]/12 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium text-sm"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewListingOpen(false)}
                  className="rounded-xl border border-[#473a87]/15 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#473a87] transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#473a87] px-5 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#3b306f]"
                >
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listing Detail View */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#473a87]/10 bg-white shadow-2xl">
            {/* Image banner */}
            {selectedListing.image_url ? (
              <div className="w-full h-56 bg-slate-100 overflow-hidden rounded-t-3xl">
                <img src={selectedListing.image_url} alt={selectedListing.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-[#473a87]/5 to-[#473a87]/10 flex items-center justify-center rounded-t-3xl">
                <svg className="w-14 h-14 text-[#473a87]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-[#24164b] leading-tight">{selectedListing.title}</h3>
                  <p className="mt-2 text-sm font-medium text-[#473a87]/60 leading-relaxed">{selectedListing.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="rounded-full p-2 text-[#473a87]/50 transition-colors hover:bg-slate-100 hover:text-[#473a87] shrink-0"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-1">Price</p>
                  <p className="text-lg font-black text-blue-600">{formatSui(selectedListing.price_sui)} <span className="text-[10px]">SUI</span></p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-1">In Stock</p>
                  <p className={`text-lg font-black ${selectedListing.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{selectedListing.stock}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-1">Seller</p>
                  <p className="text-xs font-mono font-semibold text-[#473a87]/60 truncate" title={selectedListing.seller}>{truncateAddress(selectedListing.seller)}</p>
                </div>
              </div>

              {/* Owner view: pending orders */}
              {account?.address && selectedListing.seller === account.address ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-black uppercase tracking-wider text-[#473a87]/50">Pending Orders</h4>
                  {pendingOrders.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-6 text-center">
                      <p className="text-sm font-semibold text-[#473a87]/40">No pending orders for this listing.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingOrders.map(order => {
                        const isExpanded = expandedOrderId === order.id;
                        return (
                          <div key={order.id} className="bg-slate-50 rounded-xl border border-[#473a87]/10 overflow-hidden">
                            {/* Collapsed row */}
                            <button
                              onClick={() => {
                                if (isExpanded) {
                                  setExpandedOrderId(null);
                                } else {
                                  setExpandedOrderId(order.id);
                                  setFulfillForm({ description: '', urls: [''] });
                                }
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-mono text-xs text-[#473a87]/50" title={order.buyer}>{truncateAddress(order.buyer)}</span>
                                <span className="text-xs text-[#473a87]/60 truncate max-w-[180px]" title={order.description}>{order.description}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-bold text-[#473a87]">×{order.quantity}</span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700">{order.status}</span>
                                <svg className={`w-4 h-4 text-[#473a87]/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-[#473a87]/5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                {/* Order info grid */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-0.5">Order ID</p>
                                    <p className="text-xs font-mono font-semibold text-[#473a87]/70 break-all">{order.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-0.5">Buyer</p>
                                    <p className="text-xs font-mono font-semibold text-[#473a87]/70 break-all">{order.buyer}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-0.5">Description</p>
                                    <p className="text-xs font-medium text-[#473a87]/70">{order.description}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-0.5">Quantity</p>
                                    <p className="text-xs font-bold text-[#473a87]">{order.quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-0.5">Funds Held</p>
                                    <p className="text-xs font-bold text-blue-600">{order.funds}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#473a87]/40 mb-0.5">Last Updated</p>
                                    <p className="text-xs font-medium text-[#473a87]/60">{order.last_updated}</p>
                                  </div>
                                </div>

                                {/* Fulfillment form */}
                                <form
                                  onSubmit={(e) => handleFulfillSubmit(e, order.id)}
                                  className="space-y-3 border-t border-[#473a87]/5 pt-3"
                                >
                                  <h5 className="text-[10px] font-black uppercase tracking-wider text-[#473a87]/50">Respond to Order</h5>

                                  <div>
                                    <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">Description</label>
                                    <textarea
                                      value={fulfillForm.description}
                                      onChange={(e) => setFulfillForm(prev => ({ ...prev, description: e.target.value }))}
                                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#473a87]/12 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium text-sm resize-none min-h-[60px]"
                                      placeholder="Describe your response…"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">URLs</label>
                                    <div className="space-y-2">
                                      {fulfillForm.urls.map((url, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={url}
                                            onChange={(e) => {
                                              const next = [...fulfillForm.urls];
                                              next[idx] = e.target.value;
                                              setFulfillForm(prev => ({ ...prev, urls: next }));
                                            }}
                                            className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#473a87]/12 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium text-sm"
                                            placeholder={`https://…`}
                                          />
                                          {fulfillForm.urls.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = fulfillForm.urls.filter((_, i) => i !== idx);
                                                setFulfillForm(prev => ({ ...prev, urls: next }));
                                              }}
                                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                              title="Remove URL"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => setFulfillForm(prev => ({ ...prev, urls: [...prev.urls, ''] }))}
                                        className="text-[11px] font-bold text-[#473a87]/60 hover:text-[#473a87] transition-colors flex items-center gap-1"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add another URL
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="submit"
                                      className="rounded-xl bg-[#473a87] px-5 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#3b306f]"
                                    >
                                      Submit Response
                                    </button>
                                  </div>
                                </form>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Buyer view: purchase button */
                <div>
                  {!isPurchaseOpen ? (
                    <button
                      onClick={() => setIsPurchaseOpen(true)}
                      disabled={selectedListing.stock <= 0}
                      className={`w-full py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${selectedListing.stock > 0
                        ? 'bg-[#473a87] text-white shadow-md hover:bg-[#382d6b] hover:shadow-lg focus:ring-4 focus:ring-[#473a87]/30'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                      {selectedListing.stock > 0 ? 'Purchase' : 'Out of Stock'}
                    </button>
                  ) : (
                    <form onSubmit={handlePurchaseSubmit} className="space-y-4 border border-[#473a87]/10 rounded-2xl p-4 bg-slate-50">
                      <h4 className="text-sm font-black uppercase tracking-wider text-[#473a87]/60">Order Details</h4>
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">Description</label>
                        <textarea
                          name="description" value={purchaseForm.description} onChange={handlePurchaseChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#473a87]/12 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium text-sm resize-none min-h-[80px]"
                          placeholder="Describe your order requirements…"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#473a87]/45 mb-1">Quantity</label>
                        <input
                          type="number" name="quantity" min="1" max={selectedListing.stock} value={purchaseForm.quantity} onChange={handlePurchaseChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#473a87]/12 focus:outline-none focus:ring-2 focus:ring-[#473a87]/50 text-[#473a87] font-medium text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsPurchaseOpen(false)}
                          className="rounded-xl border border-[#473a87]/15 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#473a87] transition-colors hover:bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-[#473a87] px-5 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#3b306f]"
                        >
                          Confirm Purchase
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
