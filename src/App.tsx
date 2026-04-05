import logo from './assets/icon.svg'
import { useState } from 'react'
import PartyView from './PartyView'
import NivsterView from './NivsterView'

function App() {
  const [activeView, setActiveView] = useState<'portal' | 'nivster' | 'party'>('portal');

  if (activeView === 'party') {
    return <PartyView onBack={() => setActiveView('portal')} />;
  }

  if (activeView === 'nivster') {
    return <NivsterView onBack={() => setActiveView('portal')} />;
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center p-6 space-y-12 font-sans">
      <div className="z-10 flex flex-col items-center max-w-4xl w-full">
        {/* Header Section */}
        <div className="flex flex-col items-center space-y-8 mb-16">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#473a87] to-purple-400 rounded-full blur-xl opacity-20 group-hover:opacity-30 transition duration-700" />
            <img
              src={logo}
              alt="Nivra Logo"
              className="relative w-40 h-40 md:w-48 md:h-48 object-contain drop-shadow-xl transition-transform duration-700"
            />
          </div>
          <div className="text-center space-y-4">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[#473a87] to-purple-700 pb-2">
              Nivra
            </h1>
            <p className="text-xl md:text-3xl text-[#473a87]/60 font-light tracking-wide uppercase mt-2">
              Choose User Mode
            </p>
          </div>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl px-4">
          <button
            onClick={() => setActiveView('nivster')}
            className="group relative overflow-hidden rounded-3xl bg-white border border-[#473a87]/15 p-10 hover:bg-slate-50 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(71,58,135,0.15)] flex flex-col items-center text-center space-y-6 shadow-xl shadow-[#473a87]/5"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#473a87] to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-20 h-20 rounded-2xl bg-[#473a87]/5 border border-[#473a87]/10 flex items-center justify-center text-[#473a87] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 text-4xl shadow-inner group-hover:bg-[#473a87]/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#473a87] mb-3">Nivster</h3>
              <p className="text-[#473a87]/70 text-base leading-relaxed">Enter the court as a Nivster to arbitrate and review ongoing disputes</p>
            </div>
          </button>

          <button
            onClick={() => setActiveView('party')}
            className="group relative overflow-hidden rounded-3xl bg-white border border-[#473a87]/15 p-10 hover:bg-slate-50 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(71,58,135,0.15)] flex flex-col items-center text-center space-y-6 shadow-xl shadow-[#473a87]/5"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-[#473a87] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-20 h-20 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-600 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 text-4xl shadow-inner group-hover:bg-purple-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#473a87] mb-3">Party</h3>
              <p className="text-[#473a87]/70 text-base leading-relaxed">Create and manage your dispute cases and view outcomes as a Party</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
