import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
