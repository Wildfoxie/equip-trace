import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { motion } from 'motion/react';
import { Item, ItemStatus } from '../types';
import { getStatusBadgeColor, getStatusColor, getItemIcon } from '../constants';

export default function Dashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'items'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemList: Item[] = [];
      snapshot.forEach((doc) => {
        itemList.push({ id: doc.id, ...doc.data() } as Item);
      });
      setItems(itemList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const stats = {
    total: items.length,
    available: items.filter(i => i.status === 'available').length,
    checkedOut: items.filter(i => i.status === 'checked_out').length,
    overdue: items.filter(i => i.status === 'overdue').length,
    damaged: items.filter(i => i.status === 'damaged' || i.status === 'lost').length,
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.barcodeId.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const handleExportAudit = () => {
    // Generate CSV data from current items state
    const headers = ['NAME', 'BARCODE', 'CATEGORY', 'DEPARTMENT', 'STATUS', 'HOLDER'];
    const rows = items.map(item => [
      item.name,
      item.barcodeId,
      item.category,
      item.department || 'N/A',
      item.status,
      item.holderName || ''
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EquipScan_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Central Command</h2>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
            <p className="text-xs text-gray-400 font-medium">System Status: <span className="font-bold text-gray-600">Normal</span> • {stats.total} Active Assets</p>
          </div>
        </div>
        
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
          <input 
            type="text" 
            placeholder="Quick search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-0 focus:border-black transition-all text-sm font-medium"
          />
        </div>
      </div>

      {/* Stats Grid - High Contrast Minimalism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-shadow">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Available</div>
          <div className="text-4xl font-bold text-emerald-500">{stats.available}</div>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.available/stats.total)*100}%` }} />
            </div>
          </div>
        </div>
        <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-all relative overflow-hidden">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Checked Out</div>
          <div className="flex items-center justify-between">
            <div className="text-4xl font-bold text-blue-500">{stats.checkedOut}</div>
            <div className="p-2 bg-blue-50 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-gray-400 font-bold uppercase">{stats.total > 0 ? Math.round((stats.checkedOut/stats.total)*100) : 0}% utilization</div>
          <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <CheckCircle2 className="w-24 h-24 rotate-[-15deg]" />
          </div>
        </div>
        <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-shadow">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 text-rose-400">Overdue</div>
          <div className="text-4xl font-bold text-rose-500">{stats.overdue}</div>
          <div className="mt-3 text-[10px] text-rose-500 font-black uppercase tracking-tighter">Action Required</div>
        </div>
        <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-shadow">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Maintenance</div>
          <div className="text-4xl font-bold text-gray-300">{stats.damaged}</div>
          <div className="mt-3 text-[10px] text-gray-300 font-bold uppercase">Scheduled today</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Popular Assets Carousel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Popular Assets</h3>
               <div className="flex gap-2">
                 <div className="w-2 h-2 bg-black rounded-full" />
                 <div className="w-2 h-2 bg-gray-200 rounded-full" />
                 <div className="w-2 h-2 bg-gray-200 rounded-full" />
               </div>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
               {items.slice(0, 6).map((item, idx) => {
                 const ItemIcon = getItemIcon(item.name, item.category);
                 return (
                   <motion.div 
                     key={item.id}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: idx * 0.1 }}
                     onClick={() => onNavigate?.('items')}
                     className="min-w-[240px] bg-white p-6 rounded-3xl border border-gray-100 shadow-sm snap-start hover:shadow-md transition-shadow cursor-pointer group"
                   >
                     <div className="flex flex-col h-full justify-between gap-6">
                       <div className="flex justify-between items-start">
                         <div className={`p-4 rounded-2xl ${getStatusColor(item.status)} bg-opacity-20`}>
                           <ItemIcon className="w-6 h-6" />
                         </div>
                         <TrendingUp className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                       <div>
                         <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{item.category}</p>
                       </div>
                       <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">{item.barcodeId}</span>
                          <span className="text-[10px] font-bold text-blue-500">84% Utility</span>
                       </div>
                     </div>
                   </motion.div>
                 );
               })}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold tracking-tight text-xl">Active Checkouts</h3>
              <button 
                onClick={() => onNavigate?.('items')}
                className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-2 group"
              >
                Full Registry
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                  <tr className="border-b border-gray-100">
                    <th className="px-8 py-5">Item</th>
                    <th className="px-8 py-5">Holder</th>
                    <th className="px-8 py-5">Last Action</th>
                    <th className="px-8 py-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.map(item => {
                    const TableIcon = getItemIcon(item.name, item.category);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                             <div className={`p-3 rounded-xl bg-gray-50 group-hover:bg-white transition-colors border border-gray-100`}>
                               <TableIcon className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                             </div>
                             <span className="font-bold text-gray-900">{item.name}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-gray-500 font-medium">{item.holderName || "Unassigned"}</td>
                        <td className="px-8 py-6 text-gray-400 text-xs font-mono">
                          {item.lastActionAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${getStatusBadgeColor(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-black rounded-[40px] p-10 text-white flex flex-col shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-10 font-mono">Institutional Insights</h3>
              <div className="space-y-10">
                <div className="flex justify-between items-end border-b border-white/10 pb-8">
                  <div>
                    <div className="text-[10px] opacity-40 uppercase font-black tracking-widest mb-1">Average Turnaround</div>
                    <div className="text-4xl font-bold tracking-tighter">2.4 <span className="text-sm font-normal opacity-40 uppercase tracking-widest ml-1">Days</span></div>
                  </div>
                  <div className="flex items-end gap-2 h-12">
                     {[20, 50, 30, 80, 60, 90, 75].map((h, i) => (
                       <div key={i} className="w-2 bg-white/20 rounded-full group-hover:bg-emerald-500 transition-all duration-500" style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }} />
                     ))}
                  </div>
                </div>

                <div className="space-y-8">
                   <div className="text-[10px] font-bold uppercase tracking-widest opacity-40">System Diagnostics</div>
                   <div className="flex gap-5 items-start">
                      <div className="w-1.5 h-12 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
                      <div>
                        <div className="text-sm font-bold leading-tight">Database integrity: <span className="text-emerald-400">SECURE</span></div>
                        <div className="text-[10px] font-medium opacity-40 mt-1">Consistency check passed 3m ago.</div>
                      </div>
                   </div>
                   <div className="flex gap-5 items-start">
                      <div className="w-1.5 h-12 bg-blue-500 rounded-full" />
                      <div>
                        <div className="text-sm font-bold leading-tight">RFID Gateway Connectivity</div>
                        <div className="text-[10px] font-medium opacity-40 mt-1">Nodes 1-4 active and responsive.</div>
                      </div>
                   </div>
                </div>
              </div>

              <button 
                onClick={handleExportAudit}
                className="w-full py-5 mt-12 bg-white text-black rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl active:scale-95 transform"
              >
                Generate Audit Export
              </button>
            </div>
            
            <div className="absolute -right-20 -bottom-20 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-80 h-80" />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Department Distribution</h4>
            <div className="space-y-4">
               {[
                 { label: 'Engineering', val: 65, color: 'bg-blue-500' },
                 { label: 'Design', val: 42, color: 'bg-emerald-500' },
                 { label: 'Athletics', val: 28, color: 'bg-amber-500' }
               ].map((dept, i) => (
                 <div key={i} className="space-y-1.5">
                   <div className="flex justify-between text-[10px] font-bold uppercase">
                     <span>{dept.label}</span>
                     <span className="text-gray-400">{dept.val}%</span>
                   </div>
                   <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${dept.val}%` }}
                       className={`h-full ${dept.color}`}
                     />
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

