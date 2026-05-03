import { useState } from 'react';
import { db } from './lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Scan, 
  Package, 
  Users, 
  History, 
  ChevronRight,
  PlusCircle,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import ScanScreen from './components/Scanner';
import ItemList from './components/ItemList';
import UserList from './components/UserList';
import HistoryLog from './components/HistoryLog';
import { User as AppUser } from './types';

export default function App() {
  const [appUser] = useState<AppUser>({
    id: 'guest-admin',
    name: 'Administrator',
    email: 'admin@equiptrace.ai',
    role: 'admin',
    barcodeId: 'ADMIN-01',
    itemLimit: 99,
    checkedOutCount: 0,
    hasOverdue: false,
    department: 'Central Control'
  });
  const [loading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Removed auth useEffect logic
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-black border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'Scan Now', icon: Scan, primary: true },
    { id: 'items', label: 'Inventory', icon: Package },
    { id: 'users', label: 'Contacts', icon: Users },
    { id: 'history', label: 'Activity', icon: History },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'scanner': return <ScanScreen />;
      case 'items': return <ItemList />;
      case 'users': return <UserList />;
      case 'history': return <HistoryLog />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 z-30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
            <div className="w-4 h-[2px] bg-white"></div>
          </div>
          <h1 className="font-bold tracking-tight text-xl uppercase">EQUIP<span className="font-light">SCAN</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-gray-400">
            System Status: <span className="text-emerald-500 font-bold">Normal</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute inset-0 overflow-y-auto"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation (Mobile Bottom Bar / Fixed Rail) */}
      <nav className="shrink-0 flex items-center justify-around px-2 py-4 bg-white border-t border-gray-200 pb-safe z-40">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setIsSidebarOpen(false);
            }}
            className="flex flex-col items-center gap-1 px-3 py-1 transition-all relative"
          >
            <div className={`flex flex-col items-center gap-1.5 ${
              activeTab === item.id ? 'text-black' : 'text-gray-400'
            }`}>
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
            </div>
          </button>
        ))}
      </nav>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[420px] bg-white z-[60] shadow-2xl p-12 flex flex-col border-l border-gray-100"
            >
              <div className="flex-1 flex flex-col gap-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                      <div className="w-4 h-[2px] bg-white"></div>
                    </div>
                    <h1 className="font-bold tracking-tight text-xl uppercase">EQUIP<span className="font-light">SCAN</span></h1>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-200" />
                    </div>
                    <div>
                      <h3 className="font-bold text-2xl tracking-tight leading-tight text-gray-900">{appUser?.name}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{appUser?.role}</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#F0F2F5] p-5 rounded-2xl border border-gray-200 relative overflow-hidden group">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">ID Signature</p>
                    <p className="font-mono font-bold tracking-[0.2em] text-lg text-gray-900">{appUser?.barcodeId}</p>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <ShieldCheck className="w-12 h-12" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 lg:pl-0">Local Configuration</p>
                  <nav className="space-y-2">
                     <button className="w-full flex items-center justify-between p-5 hover:bg-gray-50 rounded-2xl transition-colors group">
                        <span className="font-bold text-sm text-gray-600 group-hover:text-black">App Preferences</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black" />
                     </button>
                     <button className="w-full flex items-center justify-between p-5 hover:bg-gray-50 rounded-2xl transition-colors group">
                        <span className="font-bold text-sm text-gray-600 group-hover:text-black">Scanner Logic</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black" />
                     </button>
                     {appUser?.role === 'admin' && (
                        <button 
                          onClick={async () => {
                            const usersRef = collection(db, 'users');
                            const sampleUsers = [
                              { name: 'Alex Rivera', barcodeId: 'ID-1001', role: 'student', department: 'Engineering', checkedOutCount: 1, hasOverdue: false },
                              { name: 'Jordan Smith', barcodeId: 'ID-1002', role: 'staff', department: 'Athletics', checkedOutCount: 1, hasOverdue: true },
                              { name: 'Sami Chen', barcodeId: 'ID-1003', role: 'employee', department: 'Design', checkedOutCount: 1, hasOverdue: false },
                              { name: 'Lee Morgan', barcodeId: 'ID-1004', role: 'student', department: 'Arts', checkedOutCount: 1, hasOverdue: false },
                            ];
                            for (const user of sampleUsers) {
                              await addDoc(usersRef, user);
                            }

                            const itemsRef = collection(db, 'items');
                            const sampleItems = [
                              { name: 'MacBook Pro 14"', barcodeId: 'MAC-001', category: 'Electronics', department: 'Engineering', status: 'available', lastActionAt: serverTimestamp() },
                              { name: 'Canon EOS R6', barcodeId: 'CAM-082', category: 'Electronics', department: 'Design', status: 'checked_out', holderName: 'Alex Rivera', lastActionAt: serverTimestamp() },
                              { name: 'Spalding TF-1000', barcodeId: 'BASKET-1', category: 'Sports', department: 'Athletics', status: 'overdue', holderName: 'Jordan Smith', lastActionAt: serverTimestamp() },
                              { name: 'iPad Pro 12.9"', barcodeId: 'IPAD-042', category: 'Electronics', department: 'Education', status: 'available', lastActionAt: serverTimestamp() },
                              { name: 'Wilson Football', barcodeId: 'FOOT-009', category: 'Sports', department: 'Athletics', status: 'available', lastActionAt: serverTimestamp() },
                              { name: 'Sony WH-1000XM5', barcodeId: 'AUDIO-11', category: 'Electronics', department: 'Engineering', status: 'checked_out', holderName: 'Sami Chen', lastActionAt: serverTimestamp() },
                              { name: 'Arduino Starter Kit', barcodeId: 'STEM-02', category: 'Education', department: 'Engineering', status: 'available', lastActionAt: serverTimestamp() },
                              { name: 'Telescope 70mm', barcodeId: 'SCI-005', category: 'Education', department: 'Education', status: 'available', lastActionAt: serverTimestamp() },
                              { name: 'DJI Mavic Air 2', barcodeId: 'DRONE-01', category: 'Electronics', department: 'Design', status: 'available', lastActionAt: serverTimestamp() },
                              { name: 'Electric Guitar', barcodeId: 'MUS-077', category: 'Arts', department: 'Arts', status: 'checked_out', holderName: 'Lee Morgan', lastActionAt: serverTimestamp() },
                            ];
                            for (const item of sampleItems) {
                              await addDoc(itemsRef, item);
                            }
                            alert('Registry and Directory synchronized with sample data.');
                          }}
                          className="w-full flex items-center justify-between p-5 bg-black text-white rounded-2xl shadow-xl hover:bg-neutral-800 transition-all active:scale-95"
                        >
                          <span className="font-bold text-sm tracking-widest uppercase">Seed Sandbox Registry</span>
                          <PlusCircle className="w-4 h-4" />
                        </button>
                     )}
                  </nav>
                </div>
              </div>

            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
