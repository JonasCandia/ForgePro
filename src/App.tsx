import React, { useState, useEffect } from 'react';
import { Home, PlusCircle, History as HistoryIcon, TrendingUp, Dumbbell, LogIn, LogOut, Trophy, User as UserIcon, Sun, Moon } from 'lucide-react';
import Dashboard from './components/screens/Dashboard';
import LogWorkout from './components/screens/LogWorkout';
import History from './components/screens/History';
import Progress from './components/screens/Progress';
import ImportPlan from './components/screens/ImportPlan';
import ExecutePlannedWorkout from './components/screens/ExecutePlannedWorkout';
import UserProfile from './components/screens/UserProfile';
import Records from './components/screens/Records';
import { auth, signIn, signOutUser } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { workoutService } from './lib/workoutService';
import { ThemeProvider, useTheme } from './context/ThemeContext';

type Screen = 'home' | 'log' | 'history' | 'progress' | 'import' | 'execute' | 'profile' | 'records';

function AppInner() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        workoutService.seedExercises();
        // Check if profile exists; redirect to profile setup on first login
        const profile = await workoutService.getUserProfile();
        if (!profile) {
          setCurrentScreen('profile');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
        return <History />;
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
          />
        );
      case 'records':
        return <Records />;
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
          {(['home', 'log', 'history', 'progress', 'records'] as const).map((screen) => (
            <button 
              key={screen}
              disabled={!user}
              onClick={() => setCurrentScreen(screen)}
              className={`h-full border-b-2 flex items-center px-2 transition-colors ${currentScreen === screen ? 'text-brand border-brand' : 'text-gray-500 border-transparent hover:text-gray-300'} disabled:opacity-30`}
            >
              {screen === 'home' ? 'Painel' : screen === 'log' ? 'Registrar' : screen === 'history' ? 'Histórico' : screen === 'progress' ? 'Progresso' : 'Recordes'}
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
            <div className="group relative">
              <div
                className="w-8 h-8 rounded-full bg-surface-hover border border-input-border overflow-hidden cursor-pointer"
                onClick={() => setCurrentScreen('profile')}
              >
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-48 bg-surface border border-outline rounded-lg shadow-xl p-2 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-bold text-gray-500 px-2 py-1 uppercase">{user.displayName}</p>
                <button
                  onClick={() => setCurrentScreen('profile')}
                  className="w-full text-left px-2 py-2 text-xs text-gray-300 hover:bg-white/5 rounded flex items-center gap-2"
                >
                  <UserIcon size={14} />
                  Meu Perfil
                </button>
                <button 
                  onClick={signOutUser}
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-6 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderScreen()}
      </main>

      {/* Mobile Bottom Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-outline px-6 py-4 pb-8 z-50">
          <div className="flex justify-around items-end">
            <NavItem 
              active={currentScreen === 'home'} 
              icon={<Home size={20} />} 
              label="Início" 
              onClick={() => setCurrentScreen('home')} 
            />
            <NavItem 
              active={currentScreen === 'log'} 
              icon={<PlusCircle size={20} />} 
              label="Novo" 
              onClick={() => setCurrentScreen('log')} 
              isCenter
            />
            <NavItem 
              active={currentScreen === 'history'} 
              icon={<HistoryIcon size={20} />} 
              label="Histórico" 
              onClick={() => setCurrentScreen('history')} 
            />
            <NavItem 
              active={currentScreen === 'progress'} 
              icon={<TrendingUp size={20} />} 
              label="Progresso" 
              onClick={() => setCurrentScreen('progress')} 
            />
            <NavItem
              active={currentScreen === 'records'}
              icon={<Trophy size={20} />}
              label="Recordes"
              onClick={() => setCurrentScreen('records')}
            />
          </div>
        </nav>
      )}
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
  isCenter?: boolean;
}

function NavItem({ active, icon, label, onClick, isCenter }: NavItemProps) {
  if (isCenter) {
    return (
      <button 
        onClick={onClick}
        className="flex flex-col items-center gap-1 group -mt-8"
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${active ? 'bg-brand text-black scale-110 shadow-lg shadow-brand/40' : 'bg-surface border-2 border-brand text-brand hover:scale-110'}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${active ? 'text-brand' : 'text-gray-500'}`}>
          {label}
        </span>
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-brand scale-110' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <div className="flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">
        {label}
      </span>
      {active && <div className="w-1 h-1 rounded-full bg-brand animate-in zoom-in" />}
    </button>
  );
}

