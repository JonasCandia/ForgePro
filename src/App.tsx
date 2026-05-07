import React, { useState, useEffect, useRef } from 'react';
import { Home, PlusCircle, History as HistoryIcon, TrendingUp, Dumbbell, LogIn, LogOut, Trophy, User as UserIcon, Sun, Moon, FileDown, WifiOff, Target, ClipboardList } from 'lucide-react';
import Dashboard from './components/screens/Dashboard';
import LogWorkout from './components/screens/LogWorkout';
import History from './components/screens/History';
import Progress from './components/screens/Progress';
import ImportPlan from './components/screens/ImportPlan';
import ExecutePlannedWorkout from './components/screens/ExecutePlannedWorkout';
import UserProfile from './components/screens/UserProfile';
import Records from './components/screens/Records';
import BodyMeasurements from './components/screens/BodyMeasurements';
import TAFScore from './components/screens/TAFScore';
import ViewPlan from './components/screens/ViewPlan';
import ManageWorkouts from './components/screens/ManageWorkouts';
import { auth, signIn, signOutUser } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { workoutService } from './lib/workoutService';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useAppStore } from './store/appStore';
import { useProfile } from './hooks/useProfile';
import { useOnlineSync } from './hooks/useOnlineSync';

export type Screen = 'home' | 'log' | 'history' | 'progress' | 'import' | 'execute' | 'profile' | 'records' | 'measurements' | 'taf' | 'plan' | 'manage-workouts';

const NAV_SCREENS = ['home', 'history', 'plan', 'progress', 'taf', 'records'] as const;
type NavScreen = (typeof NAV_SCREENS)[number];

function AppInner() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const stored = sessionStorage.getItem('currentScreen') as Screen | null;
    if (stored && stored !== 'execute' && stored !== 'import') return stored;
    return 'home';
  });
  const setupChecked = useRef(false);
  const [isNewLogin, setIsNewLogin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, setUser } = useAppStore();
  const [authLoading, setAuthLoading] = useState(true);
  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const { isOnline } = useOnlineSync();

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Resolve initial auth state; detect fresh login vs refresh via sessionStorage uid
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      const prevUid = sessionStorage.getItem('lastAuthUid');
      setUser(u);
      if (u) {
        workoutService.seedExercises();
        if (u.uid !== prevUid) {
          sessionStorage.setItem('lastAuthUid', u.uid);
          setIsNewLogin(true);
        }
      } else {
        sessionStorage.removeItem('lastAuthUid');
        setIsNewLogin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [setUser]);

  // Persist active screen across page reloads
  useEffect(() => {
    sessionStorage.setItem('currentScreen', currentScreen);
  }, [currentScreen]);

  // Redirect to profile setup only on fresh login when profile doesn't exist
  useEffect(() => {
    if (setupChecked.current) return;
    if (!authLoading && user && !profileLoading) {
      setupChecked.current = true;
      if (isNewLogin && !profileError && profile === null) {
        setCurrentScreen('profile');
      }
    }
  }, [authLoading, user, isNewLogin, profileLoading, profileError, profile]);

  const loading = authLoading || (!!user && profileLoading);

  const renderScreen = () => {
    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
    
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
          <div className="bg-brand/10 p-6 rounded-full border border-brand/20">
            <Dumbbell size={64} className="text-brand" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Bem-vindo ao FORGE</h2>
            <p className="text-gray-500 mt-2">Sincronize seus treinos na nuvem e acompanhe sua evolução.</p>
          </div>
          <button 
            onClick={signIn}
            className="btn-primary w-full max-w-xs"
          >
            <LogIn size={20} />
            Entrar com Google
          </button>
        </div>
      );
    }

    switch (currentScreen) {
      case 'home':
        return <Dashboard onNavigate={setCurrentScreen} />;
      case 'log':
        return <LogWorkout onBack={() => setCurrentScreen('home')} />;
      case 'history':
        return <History onNavigate={setCurrentScreen} />;
      case 'manage-workouts':
        return <ManageWorkouts onBack={() => setCurrentScreen('history')} />;
      case 'progress':
        return <Progress />;
      case 'import':
        return <ImportPlan onBack={() => setCurrentScreen('home')} />;
      case 'execute':
        return <ExecutePlannedWorkout onBack={() => setCurrentScreen('home')} />;
      case 'profile':
        return (
          <UserProfile
            onBack={() => setCurrentScreen('home')}
            onSaved={() => setCurrentScreen('home')}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        );
      case 'records':
        return <Records />;
      case 'measurements':
        return <BodyMeasurements onBack={() => setCurrentScreen('home')} />;
      case 'taf':
        return <TAFScore />;
      case 'plan':
        return <ViewPlan onNavigateImport={() => setCurrentScreen('import')} />;
      default:
        return <Dashboard onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-200 font-sans selection:bg-brand selection:text-black">
      {/* Top Header / Navigation */}
      <nav className="h-16 border-b border-outline bg-surface flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-brand p-1.5 rounded">
            <Dumbbell className="text-black" size={20} />
          </div>
          <span className="text-xl font-black tracking-tighter text-brand italic">FORGE PRO</span>
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 text-[11px] font-bold uppercase tracking-widest h-full">
          {(['home', 'plan', 'history', 'progress', 'records', 'measurements', 'taf', 'import'] as const).map((screen) => (
            <button 
              key={screen}
              disabled={!user}
              onClick={() => setCurrentScreen(screen)}
              className={`h-full border-b-2 flex items-center px-2 transition-colors ${currentScreen === screen ? 'text-brand border-brand' : 'text-gray-500 border-transparent hover:text-gray-300'} disabled:opacity-30`}
            >
              {screen === 'home' ? 'Painel' : screen === 'plan' ? 'Plano' : screen === 'history' ? 'Histórico' : screen === 'progress' ? 'Progresso' : screen === 'records' ? 'Recordes' : screen === 'measurements' ? 'Medidas' : screen === 'taf' ? 'TAF' : 'Importar'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-brand transition-colors rounded-lg hover:bg-white/5"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand">
            <span className={`w-2 h-2 rounded-full ${user ? 'bg-brand' : 'bg-gray-500'} animate-pulse`}></span>
            {user ? 'CONECTADO' : 'OFFLINE'}
          </div>
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                className="w-8 h-8 rounded-full bg-surface-hover border border-input-border overflow-hidden cursor-pointer"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="Menu do usuário"
                aria-expanded={dropdownOpen}
              >
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </button>
              <div className={`absolute right-0 top-full mt-2 w-48 bg-surface border border-outline rounded-lg shadow-xl p-2 animate-in fade-in slide-in-from-top-2 ${dropdownOpen ? 'block' : 'hidden'}`}>
                <p className="text-[10px] font-bold text-gray-500 px-2 py-1 uppercase">{user.displayName}</p>
                <button
                  onClick={() => { setCurrentScreen('profile'); setDropdownOpen(false); }}
                  className="w-full text-left px-2 py-2 text-xs text-gray-300 hover:bg-white/5 rounded flex items-center gap-2"
                >
                  <UserIcon size={14} />
                  Meu Perfil
                </button>
                <button
                  onClick={() => { setCurrentScreen('plan'); setDropdownOpen(false); }}
                  className="w-full text-left px-2 py-2 text-xs text-gray-300 hover:bg-white/5 rounded flex items-center gap-2"
                >
                  <ClipboardList size={14} />
                  Ver Plano
                </button>
                <button
                  onClick={() => { setCurrentScreen('import'); setDropdownOpen(false); }}
                  className="w-full text-left px-2 py-2 text-xs text-gray-300 hover:bg-white/5 rounded flex items-center gap-2"
                >
                  <FileDown size={14} />
                  Importar Plano
                </button>
                <button 
                  onClick={() => { signOutUser(); setDropdownOpen(false); }}
                  className="w-full text-left px-2 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Sair da conta
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Offline banner */}
      {!isOnline && (
        <div className="sticky top-[57px] z-40 w-full bg-yellow-900/90 border-b border-yellow-700/50 px-4 py-2 flex items-center gap-2 backdrop-blur-sm">
          <WifiOff size={13} className="text-yellow-400 flex-shrink-0" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-300">
            Sem conexão — dados em cache. Alterações serão sincronizadas ao reconectar.
          </p>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-6 pb-24">
        <div key={currentScreen} className="screen-enter">
          {renderScreen()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {user && (() => {
        const activeNavIndex = NAV_SCREENS.indexOf(currentScreen as NavScreen);
        const tabW = 100 / NAV_SCREENS.length;
        return (
          <>
            {/* FAB — Novo Treino */}
            <div className="fixed bottom-[5.5rem] right-4 z-50">
              {currentScreen !== 'log' && (
                <span
                  className="fab-ring absolute inset-0 rounded-full bg-brand pointer-events-none"
                  aria-hidden="true"
                />
              )}
              <button
                onClick={() => setCurrentScreen('log')}
                aria-label="Novo treino"
                className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 active:scale-90 ${
                  currentScreen === 'log'
                    ? 'bg-brand text-black scale-110 shadow-brand/40'
                    : 'bg-brand text-black hover:brightness-110 shadow-brand/25'
                }`}
              >
                <PlusCircle size={24} />
              </button>
            </div>

            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface z-40 pb-[env(safe-area-inset-bottom,1.5rem)]">
              {/* Sliding HUD indicator */}
              <div className="relative h-[2px] bg-outline overflow-hidden">
                <div
                  className="absolute top-0 h-full bg-brand"
                  style={{
                    width: `${tabW}%`,
                    transform: activeNavIndex >= 0
                      ? `translateX(${activeNavIndex * 100}%)`
                      : 'translateX(-100%)',
                    transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 0 8px 1px oklch(88% 0.28 125 / 0.7)',
                  }}
                />
              </div>
              <div className="flex items-stretch border-t border-outline">
                <NavItem active={currentScreen === 'home'}     icon={<Home size={20} />}         label="Início"    onClick={() => setCurrentScreen('home')} />
                <NavItem active={currentScreen === 'history'}  icon={<HistoryIcon size={20} />}  label="Histórico" onClick={() => setCurrentScreen('history')} />
                <NavItem active={currentScreen === 'plan'}     icon={<ClipboardList size={20} />} label="Plano"    onClick={() => setCurrentScreen('plan')} />
                <NavItem active={currentScreen === 'progress'} icon={<TrendingUp size={20} />}   label="Progresso" onClick={() => setCurrentScreen('progress')} />
                <NavItem active={currentScreen === 'taf'}      icon={<Target size={20} />}       label="TAF"       onClick={() => setCurrentScreen('taf')} />
                <NavItem active={currentScreen === 'records'}  icon={<Trophy size={20} />}       label="Recordes"  onClick={() => setCurrentScreen('records')} />
              </div>
            </nav>
          </>
        );
      })()}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

interface NavItemProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function NavItem({ active, icon, label, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex flex-col items-center justify-center flex-1 min-h-[52px] gap-1 py-2 transition-colors duration-200 active:scale-90 ${
        active ? 'text-brand' : 'text-gray-500 hover:text-gray-400'
      }`}
    >
      <div
        className={`flex items-center justify-center transition-transform duration-250 ${
          active ? 'scale-110 nav-icon-active' : ''
        }`}
      >
        {icon}
      </div>
      <span
        className={`text-[9px] font-black uppercase tracking-widest leading-none ${
          active ? 'nav-label-active' : 'opacity-0 pointer-events-none'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

