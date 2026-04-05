import { useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import logo from './assets/icon.svg';
import NivsterDashboard from './NivsterDashboard';
import CourtExplorer from './CourtExplorer';

interface NivsterViewProps {
  onBack: () => void;
}

export default function NivsterView({ onBack }: NivsterViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courts' | 'cases'>('dashboard');

  return (
    <div className="min-h-screen bg-white text-[#473a87] font-sans flex flex-col">
      {/* Navigation Bar */}
      <nav className="relative flex items-center justify-between px-8 py-4 border-b border-[#473a87]/10 bg-white sticky top-0 z-50">

        {/* Left: Back + Logo */}
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
            <div className="flex items-baseline gap-2">
              <span className="font-black text-2xl tracking-tighter text-[#473a87] hidden sm:inline-block">Nivra</span>
              <span className="text-xs font-black uppercase tracking-widest text-[#473a87]/30 hidden sm:inline-block">Nivster</span>
            </div>
          </div>
        </div>

        {/* Center: Nav Links */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-6">
          {([
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'courts',    label: 'Courts'    },
            { key: 'cases',     label: 'My Cases'  },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`text-lg font-semibold transition-colors ${activeTab === key ? 'text-[#473a87] border-b-2 border-[#473a87]' : 'text-[#473a87]/50 hover:text-[#473a87]/80'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right: Wallet */}
        <div className="flex-1 flex justify-end">
          <ConnectButton />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-h-0 p-8 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && <NivsterDashboard />}
        {activeTab === 'courts'    && <CourtExplorer nivsterMode />}
        {activeTab === 'cases'     && (
          <div className="flex flex-col items-center justify-center p-20 text-[#473a87]/40">
            <h2 className="text-3xl font-bold mb-2 text-purple-600">My Cases</h2>
            <p>Your assigned juror cases will appear here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
