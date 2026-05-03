import { useState, useRef, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { 
  Scan, 
  Camera, 
  Keyboard, 
  X, 
  Check, 
  AlertTriangle, 
  ArrowRightLeft, 
  Plus, 
  Trash2, 
  ChevronRight,
  User as UserIcon,
  Package,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item, User, ItemStatus } from '../types';

type ScanMode = 'single' | 'bulk_out' | 'bulk_in';

export default function ScanScreen() {
  const [scanMode, setScanMode] = useState<ScanMode>('single');
  const [scannedId, setScannedId] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [bulkItems, setBulkItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isManual, setIsManual] = useState(false);

  // Audio simulation
  const playBeep = () => {
    // In a real app, play a short pulse sound
    if (navigator.vibrate) navigator.vibrate(100);
  };

  const handleScan = async (id: string) => {
    if (!id) return;
    playBeep();
    setStatus('loading');
    
    try {
      // 1. Try to find the item by barcode
      const itemsRef = collection(db, 'items');
      const q = query(itemsRef, where('barcodeId', '==', id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const itemDoc = querySnapshot.docs[0];
        const item = { id: itemDoc.id, ...itemDoc.data() } as Item;
        
        if (scanMode === 'single') {
          setActiveItem(item);
          setIsScanning(false);
          setStatus('success');
        } else if (scanMode === 'bulk_out') {
          if (item.status !== 'available') {
            setErrorMsg(`${item.name} is not available.`);
            setStatus('error');
          } else if (!bulkItems.find(i => i.id === item.id)) {
            setBulkItems([...bulkItems, item]);
            setStatus('idle');
          } else {
            setStatus('idle');
          }
        } else if (scanMode === 'bulk_in') {
          if (item.status === 'available') {
            setErrorMsg(`${item.name} is already checked in.`);
            setStatus('error');
          } else if (!bulkItems.find(i => i.id === item.id)) {
            setBulkItems([...bulkItems, item]);
            setStatus('idle');
          } else {
            setStatus('idle');
          }
        }
      } else {
        // 2. If no item, try to find a user by barcode (for Check-Out assignment)
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('barcodeId', '==', id));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const user = { id: userDoc.id, ...userDoc.data() } as User;
          
          if (user.hasOverdue) {
            setErrorMsg(`${user.name} has overdue items.`);
            setStatus('error');
          } else {
            setActiveUser(user);
            playBeep();
            setStatus('success');
          }
        } else {
          setErrorMsg('Record not found.');
          setStatus('error');
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'items/users');
      setErrorMsg('System error. Please retry.');
      setStatus('error');
    }
    setScannedId('');
  };

  const processSingleAction = async (action: 'out' | 'in') => {
    if (!activeItem) return;
    setStatus('loading');
    
    try {
      const batch = writeBatch(db);
      const itemRef = doc(db, 'items', activeItem.id);
      
      if (action === 'out') {
        if (!activeUser) {
          setErrorMsg('Please scan/select a user first.');
          setStatus('error');
          return;
        }
        
        const timestamp = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // Default 7 days

        batch.update(itemRef, {
          status: 'checked_out',
          holderId: activeUser.id,
          holderName: activeUser.name,
          lastActionAt: timestamp,
          dueDate: dueDate
        });

        const userRef = doc(db, 'users', activeUser.id);
        batch.update(userRef, {
          checkedOutCount: (activeUser.checkedOutCount || 0) + 1
        });

        const logRef = doc(collection(db, 'logs'));
        batch.set(logRef, {
          itemId: activeItem.id,
          itemName: activeItem.name,
          userId: activeUser.id,
          userName: activeUser.name,
          action: 'check_out',
          timestamp: serverTimestamp()
        });
      } else {
        batch.update(itemRef, {
          status: 'available',
          holderId: null,
          holderName: null,
          lastActionAt: serverTimestamp(),
          dueDate: null
        });

        if (activeItem.holderId) {
          const userRef = doc(db, 'users', activeItem.holderId);
          // We need to fetch current count to be safe, but for V1 we'll just dec if possible
          // In real production, use an increment operator
          // batch.update(userRef, { checkedOutCount: increment(-1) });
        }

        const logRef = doc(collection(db, 'logs'));
        batch.set(logRef, {
          itemId: activeItem.id,
          itemName: activeItem.name,
          userId: auth.currentUser?.uid,
          userName: 'Staff',
          action: 'check_in',
          timestamp: serverTimestamp()
        });
      }

      await batch.commit();
      resetScanner();
    } catch (err) {
      setErrorMsg('Update failed.');
      setStatus('error');
    }
  };

  const processBulkAction = async () => {
    if (bulkItems.length === 0) return;
    if (scanMode === 'bulk_out' && !activeUser) {
      setErrorMsg('Please assign a user first.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const batch = writeBatch(db);
      const timestamp = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      for (const item of bulkItems) {
        const itemRef = doc(db, 'items', item.id);
        const logRef = doc(collection(db, 'logs'));

        if (scanMode === 'bulk_out' && activeUser) {
          batch.update(itemRef, {
            status: 'checked_out',
            holderId: activeUser.id,
            holderName: activeUser.name,
            lastActionAt: timestamp,
            dueDate: dueDate
          });
          batch.set(logRef, {
            itemId: item.id,
            itemName: item.name,
            userId: activeUser.id,
            userName: activeUser.name,
            action: 'check_out',
            timestamp: serverTimestamp()
          });
        } else if (scanMode === 'bulk_in') {
          batch.update(itemRef, {
            status: 'available',
            holderId: null,
            holderName: null,
            lastActionAt: serverTimestamp(),
            dueDate: null
          });
          batch.set(logRef, {
            itemId: item.id,
            itemName: item.name,
            userId: auth.currentUser?.uid,
            userName: 'Staff',
            action: 'check_in',
            timestamp: serverTimestamp()
          });
        }
      }

      if (scanMode === 'bulk_out' && activeUser) {
        const userRef = doc(db, 'users', activeUser.id);
        batch.update(userRef, {
          checkedOutCount: (activeUser.checkedOutCount || 0) + bulkItems.length
        });
      }

      await batch.commit();
      resetScanner();
    } catch (err) {
      setErrorMsg('Bulk operation failed.');
      setStatus('error');
    }
  };

  const resetScanner = () => {
    setActiveItem(null);
    setActiveUser(null);
    setBulkItems([]);
    setScannedId('');
    setIsScanning(true);
    setStatus('idle');
    setErrorMsg('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Dynamic Header based on scanning state */}
      <div className="bg-white p-6 border-b border-gray-100 shrink-0 z-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">
            {scanMode === 'single' ? 'Equipment Scan' : scanMode === 'bulk_out' ? 'Bulk Checkout' : 'Bulk Return'}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setScanMode('single');
                resetScanner();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${scanMode === 'single' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              Single
            </button>
            <button 
              onClick={() => {
                setScanMode('bulk_out');
                resetScanner();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${scanMode === 'bulk_out' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              Bulk Out
            </button>
            <button 
              onClick={() => {
                setScanMode('bulk_in');
                resetScanner();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${scanMode === 'bulk_in' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              Bulk In
            </button>
          </div>
        </div>

        {/* Bulk Context Bar */}
        {(scanMode !== 'single' && bulkItems.length > 0) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-bold">
                {bulkItems.length}
              </div>
              <div className="text-sm">
                <p className="font-bold">Items queued</p>
                <p className="text-xs text-gray-500">Ready for processing</p>
              </div>
            </div>
            <button 
              onClick={processBulkAction}
              className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform"
            >
              Finish {bulkItems.length} Items &rarr;
            </button>
          </motion.div>
        )}

        {/* User Context Bar (For Checkout) */}
        {activeUser && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-blue-600 tracking-widest">Assigning to</p>
                <p className="font-bold">{activeUser.name}</p>
              </div>
            </div>
            <button onClick={() => setActiveUser(null)} className="p-2 hover:bg-blue-100 rounded-lg text-blue-400">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </div>

      {/* Camera / Interaction View */}
      <div className="flex-1 relative bg-black overflow-hidden m-4 rounded-3xl">
        <AnimatePresence>
          {isScanning && (
            <motion.div 
              key="camera-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* Simulated Camera Feed */}
              <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center overflow-hidden">
                 <div className="w-full h-full opacity-30 bg-repeat bg-center" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }} />
                 <Camera className="w-20 h-20 text-gray-800 opacity-50 pulse" />
                 
                 {/* Scanning Overlay UI - Refined */}
                 <div className="absolute inset-0 border-[60px] border-black/80 pointer-events-none" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-44 pointer-events-none border border-white/20">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white" />
                    
                    {/* Theme Accurate Red Scanning Line */}
                    <motion.div 
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-1/2 -translate-x-1/2 w-64 h-[2px] bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] opacity-70"
                    />
                 </div>
                 <div className="absolute bottom-10 inset-x-0 text-center">
                   <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Point Camera at Barcode</span>
                 </div>
              </div>

              {/* Interaction Controls */}
              <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-6 px-8 z-10">
                {status === 'error' && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-black text-rose-500 px-6 py-4 rounded-xl flex items-center gap-3 shadow-2xl border border-rose-500/20"
                  >
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="font-bold text-xs uppercase tracking-widest">{errorMsg}</span>
                    <button onClick={() => setStatus('idle')} className="ml-2 hover:bg-white/10 p-1 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                <div className="w-full max-w-lg space-y-4">
                  {!isManual ? (
                    <div className="flex justify-between items-center bg-black text-white p-2 border border-white/10 rounded-xl shadow-2xl relative overflow-hidden group">
                       <button 
                        onClick={() => setIsManual(true)}
                        className="flex items-center gap-2 pl-6 pr-4 py-4 text-white/40 hover:text-white transition-colors z-10"
                       >
                         <Keyboard className="w-4 h-4" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Manual Lookup</span>
                       </button>
                       <div className="flex items-center gap-2 pr-6 z-10">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                         <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Live Focus</span>
                       </div>
                       <input 
                         autoFocus
                         value={scannedId}
                         onChange={(e) => {
                           setScannedId(e.target.value);
                           if (e.target.value.length >= 4) {
                             handleScan(e.target.value);
                           }
                         }}
                         className="absolute inset-0 w-full h-full bg-transparent opacity-0 cursor-none"
                       />
                    </div>
                  ) : (
                    <motion.div 
                      layoutId="manual-input"
                      className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-2xl border border-gray-200"
                    >
                      <input 
                        placeholder="ENTER BARCODE ID..."
                        className="flex-1 px-4 py-4 bg-gray-50 rounded-lg focus:outline-none font-mono font-bold tracking-widest uppercase text-sm"
                        value={scannedId}
                        onChange={(e) => setScannedId(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleScan(scannedId)}
                      />
                      <button 
                        onClick={() => handleScan(scannedId)}
                        disabled={status === 'loading'}
                        className="bg-black text-white px-8 py-4 rounded-lg font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-50"
                      >
                         Process
                      </button>
                      <button 
                        onClick={() => setIsManual(false)}
                        className="bg-gray-100 text-gray-500 p-3 rounded-lg hover:bg-black hover:text-white transition-all"
                      >
                        <Scan className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Action/Result View */}
          {activeItem && !isScanning && (
            <motion.div 
              key="action-view"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute inset-0 bg-white z-40 flex flex-col p-8 rounded-3xl shadow-inner scroll-smooth"
            >
              <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-2xl mb-4 ${activeItem.status === 'available' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                  <Package className="w-10 h-10" />
                </div>
                <button onClick={resetScanner} className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-3xl font-bold tracking-tight">{activeItem.name}</h3>
                  </div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{activeItem.barcodeId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <p className={`font-bold capitalize ${activeItem.status === 'available' ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {activeItem.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Category</p>
                    <p className="font-bold">{activeItem.category || 'N/A'}</p>
                  </div>
                </div>

                {activeItem.status !== 'available' && activeItem.holderName && (
                  <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-600/10 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest">Current Holder</p>
                        <p className="font-bold text-amber-900">{activeItem.holderName}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto space-y-4">
                {activeItem.status === 'available' ? (
                  <button 
                    onClick={() => {
                        if (!activeUser) {
                          setIsScanning(true); // Re-open scanner to find a user
                        } else {
                          processSingleAction('out');
                        }
                    }}
                    disabled={status === 'loading'}
                    className="w-full py-5 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {status === 'loading' ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                      <>
                        <ArrowRightLeft className="w-6 h-6 rotate-90" />
                        Check Out to {activeUser?.name || 'User...'}
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={() => processSingleAction('in')}
                    disabled={status === 'loading'}
                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {status === 'loading' ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                      <>
                        <Check className="w-6 h-6" />
                        Confirm Return
                      </>
                    )}
                  </button>
                )}

                <button 
                  onClick={() => {/* Open Report Issue Screen */}}
                  className="w-full py-5 bg-white border border-gray-200 text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                  Report Damage / Issue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk List Subview */}
      {bulkItems.length > 0 && isScanning && (
        <div className="px-6 pb-6 overflow-y-auto max-h-[30vh]">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Recently Scanned ({bulkItems.length})</p>
          <div className="space-y-2">
            {bulkItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Package className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate max-w-[120px]">{item.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono tracking-tighter">{item.barcodeId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setBulkItems(bulkItems.filter(i => i.id !== item.id))}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
