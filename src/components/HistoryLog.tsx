import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  Plus, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { Log } from '../types';

export default function HistoryLog() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logList: Log[] = [];
      snapshot.forEach((doc) => {
        logList.push({ id: doc.id, ...doc.data() } as Log);
      });
      setLogs(logList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Activity Ledger</h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-none">Live Monitoring Active</p>
          </div>
        </div>
        <div className="hidden md:flex bg-white px-5 py-3 rounded-xl border border-gray-100 items-center gap-3 shadow-sm">
           <History className="w-4 h-4 text-gray-400" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">50 Most Recent Entries</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {loading ? (
          [1, 2, 3, 4, 5].map(n => <div key={n} className="h-20 bg-white animate-pulse" />)
        ) : logs.length > 0 ? (
          logs.map((log) => (
            <div key={log.id} className="flex items-center gap-6 p-6 hover:bg-gray-50/50 transition-colors group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm transition-transform group-hover:scale-95 ${getActionStyles(log.action).bg}`}>
                {getActionIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 leading-snug">
                  <span className="font-bold text-gray-900">{log.userName || 'System'}</span> 
                  {` ${getActionVerb(log.action)} `} 
                  <span className="font-bold text-black bg-gray-100 px-2 py-0.5 rounded-md inline-block mt-0.5">{log.itemName}</span>
                </p>
                <div className="flex items-center gap-2 mt-2 text-gray-300">
                   <Clock className="w-3 h-3 shrink-0" />
                   <p className="text-[9px] font-black uppercase tracking-widest">
                     {log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.timestamp?.toDate().toLocaleDateString()}
                   </p>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hash ID</div>
                 <div className="text-[10px] font-mono font-medium text-gray-300">{log.id?.slice(-8).toUpperCase()}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Ledger is currently empty.</div>
        )}
      </div>
    </div>
  );
}

function getActionIcon(action: string) {
  switch (action) {
    case 'check_out': return <ArrowUpRight className="w-5 h-5 text-blue-600" />;
    case 'check_in': return <ArrowDownLeft className="w-5 h-5 text-emerald-600" />;
    case 'report_issue': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    case 'add_item': return <Plus className="w-5 h-5 text-gray-600" />;
    case 'update_item': return <RefreshCw className="w-5 h-5 text-purple-600" />;
    default: return <History className="w-5 h-5 text-gray-600" />;
  }
}

function getActionStyles(action: string) {
  switch (action) {
    case 'check_out': return { bg: 'bg-blue-50 group-hover:bg-blue-100' };
    case 'check_in': return { bg: 'bg-emerald-50 group-hover:bg-emerald-100' };
    case 'report_issue': return { bg: 'bg-orange-50 group-hover:bg-orange-100' };
    case 'add_item': return { bg: 'bg-gray-50 group-hover:bg-gray-200' };
    default: return { bg: 'bg-gray-50 group-hover:bg-gray-100' };
  }
}

function getActionVerb(action: string) {
  switch (action) {
    case 'check_out': return 'checked out';
    case 'check_in': return 'returned';
    case 'report_issue': return 'reported an issue on';
    case 'add_item': return 'registered';
    case 'update_item': return 'modified';
    default: return 'interaction with';
  }
}
