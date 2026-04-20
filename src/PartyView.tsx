import { useState, useEffect } from 'react';
import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import logo from './assets/icon.svg';
import { useNetworkConfig } from './constants';
import AdminPanel from './AdminPanel';
import Dashboard from './Dashboard';
import CourtExplorer from './CourtExplorer';
import Marketplace from './Marketplace';

interface PartyViewProps {
  onBack: () => void;
}

export default function PartyView({ onBack }: PartyViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courts' | 'marketplace' | 'admin'>('dashboard');

  const account = useCurrentAccount();
  const client = useCurrentClient();
  const networkConfig = useNetworkConfig();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!account?.address || !networkConfig) {
      setIsAdmin(false);
      return;
    }

    async function fetchRegistry() {
      const registryId = (networkConfig as any).registryId;
      const obj = await client.getObject({
        objectId: registryId,
        include: { json: true } as any,
      });
      const admin_whitelist: string[] = (obj as any).object?.json?.admin_whitelist?.contents || [];
      if (account?.address && admin_whitelist.includes(account.address)) {
        setIsAdmin(true);
      }
    }

    fetchRegistry();
  }, [account?.address, networkConfig]);

  return (
    <div className="min-h-screen bg-white text-[#473a87] font-sans flex flex-col">
      {/* Navigation Bar */}
      <nav className="relative flex items-center justify-between px-8 py-4 border-b border-[#473a87]/10 bg-white sticky top-0 z-50">

        {/* Left: Back Button & Logo */}
        <div className="flex items-center space-x-6 flex-1">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            title="Back to Portal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="flex items-center space-x-3">
            <img src={logo} alt="Nivra Logo" className="w-10 h-10 object-contain" />
            <span className="font-black text-2xl tracking-tighter text-[#473a87] hidden sm:inline-block">Nivra</span>
          </div>
        </div>

        {/* Center: Nav Links */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-6">
          {(['dashboard', 'courts', 'marketplace'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-lg font-semibold capitalize transition-colors ${activeTab === tab ? 'text-[#473a87] border-b-2 border-[#473a87]' : 'text-[#473a87]/50 hover:text-[#473a87]/80'}`}
            >
              {tab}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`text-lg font-semibold transition-colors ${activeTab === 'admin' ? 'text-[#473a87] border-b-2 border-[#473a87]' : 'text-[#473a87]/50 hover:text-[#473a87]/80'}`}
            >
              Admin
            </button>
          )}
        </div>

        {/* Right: Wallet */}
        <div className="flex-1 flex justify-end">
          <ConnectButton />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-h-0 p-8 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'courts' && <CourtExplorer />}
        {activeTab === 'marketplace' && <Marketplace />}
        {activeTab === 'admin' && isAdmin && (
          <div className="w-full">
            <AdminPanel />
          </div>
        )}
      </main>
    </div>
  );
}
