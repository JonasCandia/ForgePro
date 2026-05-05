import React, { useState, useEffect } from 'react';
import { Home, PlusCircle, History as HistoryIcon, TrendingUp, Dumbbell, LogIn, LogOut, Moon, Sun, User } from 'lucide-react';
import Dashboard from './components/screens/Dashboard';
import LogWorkout from './components/screens/LogWorkout';
import History from './components/screens/History';
import Progress from './components/screens/Progress';
import ImportPlan from './components/screens/ImportPlan';
import ActiveWorkout from './components/screens/ActiveWorkout';
import ProfileSetup from './components/screens/ProfileSetup';
import { auth, signIn, signOutUser } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { workoutService } from './lib/workoutService';
import { UserProfile } from './types';

type Screen = 'home' | 'log' | 'history' | 'progress' | 'import' | 'execute' | 'profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDark]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        workoutService.seedExercises();
        const p = await workoutService.getProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const renderScreen = () => {
    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-12 h-12 border-4 border-brand border-t-transparent animate-spin"></div></div>;
    
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-8 px-6">
          <div className="bg-brand border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(204,255,0,0.2)]">
            <Dumbbell size={64} className="text-black" />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black uppercase tracking-tighter italic text-[var(--color-text-main)]">FORGE PRO</h1>
            <p className="text-[var(--color-text-muted)] font-bold text-xs uppercase tracking-[0.2em]">O limite é apenas o começo.</p>
          </div>
          <button 
            onClick={signIn}
            className="btn-primary w-full max-w-xs text-lg"
          >
            <LogIn size={20} />
            ENTRAR COM GOOGLE
          </button>
        </div>
      );
    }

    // Force profile setup if missing
    if (!profile && currentScreen !== 'profile') {
      return <ProfileSetup onComplete={async () => {
        const p = await workoutService.getProfile(user.uid);
        setProfile(p);
        setCurrentScreen('home');
      }} />;
    }

    switch (currentScreen) {
      case 'home':
        return <Dashboard onNavigate={setCurrentScreen} />;
      case 'log':
        // Legacy or quick log
        return <LogWorkout onBack={() => setCurrentScreen('home')} />;
      case 'history':
        return <History />;
      case 'progress':
        return <Progress />;
      case 'import':
        return <ImportPlan onBack={() => setCurrentScreen('home')} />;
      case 'execute':
        return <ActiveWorkout onBack={() => setCurrentScreen('home')} />;
      case 'profile':
        return <ProfileSetup onComplete={async () => {
          const p = await workoutService.getProfile(user.uid);
          setProfile(p);
          setCurrentScreen('home');
        }} />;
      default:
        return <Dashboard onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] font-sans border-t-4 border-brand">
      <nav className="h-20 border-b border-[var(--color-outline)] bg-[var(--color-surface)]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black tracking-tighter text-brand italic drop-shadow-[0_0_10px_rgba(204,255,0,0.3)]">FORGE.</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-3 bg-[var(--color-surface-hover)] border border-[var(--color-outline)] rounded-xl hover:border-brand/40 transition-all text-[var(--color-text-muted)] hover:text-brand"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user && (
            <div 
              onClick={() => setCurrentScreen('profile')}
              className="w-12 h-12 border border-[var(--color-outline)] bg-[var(--color-surface-hover)] p-0.5 rounded-xl overflow-hidden cursor-pointer active:scale-95 hover:border-brand/50 transition-all shadow-lg"
            >
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="Avatar" 
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 pb-40">
        {renderScreen()}
      </main>

      {user && profile && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg bg-[var(--color-surface)]/80 backdrop-blur-xl border border-[var(--color-outline)] px-6 py-3 rounded-2xl z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex justify-around items-center">
            <NavItem 
              active={currentScreen === 'home'} 
              icon={<Home size={22} />} 
              label="Início" 
              onClick={() => setCurrentScreen('home')} 
            />
            <NavItem 
              active={currentScreen === 'execute'} 
              icon={<PlusCircle size={28} />} 
              label="Treinar" 
              onClick={() => setCurrentScreen('execute')} 
              isCenter
            />
            <NavItem 
              active={currentScreen === 'history'} 
              icon={<HistoryIcon size={22} />} 
              label="Logs" 
              onClick={() => setCurrentScreen('history')} 
            />
            <NavItem 
              active={currentScreen === 'progress'} 
              icon={<TrendingUp size={22} />} 
              label="Status" 
              onClick={() => setCurrentScreen('progress')} 
            />
          </div>
        </nav>
      )}
    </div>
  );
}

interface NavItemProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isCenter?: boolean;
}

function NavItem({ active, icon, label, onClick, isCenter }: NavItemProps) {
  if (isCenter) {
    return (
      <button 
        onClick={onClick}
        className="flex flex-col items-center gap-1 -mt-12 group"
      >
        <div className={`w-16 h-16 flex items-center justify-center transition-all duration-300 rounded-2xl border-4 ${active ? 'bg-brand border-[var(--color-background)] text-black scale-110 shadow-[0_0_25px_rgba(204,255,0,0.5)]' : 'bg-brand text-black border-[var(--color-background)] shadow-xl group-hover:scale-110'}`}>
          {icon}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest mt-1 transition-colors ${active ? 'text-brand' : 'text-[var(--color-text-muted)]'}`}>
          {label}
        </span>
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-brand scale-110 -translate-y-1' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
    >
      <div className={`flex items-center justify-center ${active ? 'drop-shadow-[0_0_5px_rgba(204,255,0,0.5)]' : ''}`}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.15em]">
        {label}
      </span>
    </button>
  );
}

