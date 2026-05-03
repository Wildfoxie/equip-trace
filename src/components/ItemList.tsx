import { useState, useEffect, FormEvent } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  Trash2, 
  Edit3, 
  MoreVertical,
  X,
  History,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item, ItemStatus } from '../types';
import { getStatusColor, getStatusBadgeColor, getItemIcon } from '../constants';

export default function ItemList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Add Form State
  const [newName, setNewName] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newCategory, setNewCategory] = useState('Sports');
  const [newDepartment, setNewDepartment] = useState('Engineering');
  const [isSaving, setIsSaving] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | ItemStatus>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

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

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName || !newBarcode) return;
    
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'items'), {
        name: newName,
        barcodeId: newBarcode,
        category: newCategory,
        department: newDepartment,
        status: 'available',
        lastActionAt: serverTimestamp(),
      });
      
      // Auto-log
      await addDoc(collection(db, 'logs'), {
        itemId: 'new', // In real app, get ID from addDoc result
        itemName: newName,
        action: 'add_item',
        timestamp: serverTimestamp(),
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName
      });

      setNewName('');
      setNewBarcode('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    await deleteDoc(doc(db, 'items', id));
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.barcodeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesDept = departmentFilter === 'all' || i.department === departmentFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const departments = Array.from(new Set(items.map(i => i.department).filter(Boolean)));

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Inventory Registry</h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{items.length} Registered Assets</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <button 
               onClick={() => setStatusFilter('all')}
               className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
             >
               All
             </button>
             <button 
               onClick={() => setStatusFilter('available')}
               className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === 'available' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
             >
               Available
             </button>
             <button 
               onClick={() => setStatusFilter('checked_out')}
               className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === 'checked_out' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
             >
               Out
             </button>
             <button 
               onClick={() => setStatusFilter('overdue')}
               className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === 'overdue' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
             >
               Overdue
             </button>
          </div>

          <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer text-gray-500"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
            <input 
              type="text" 
              placeholder="Search registry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-0 focus:border-black transition-all text-sm font-medium"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-lg active:scale-95 transition-transform shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3, 4, 5].map(n => <div key={n} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const ItemIcon = getItemIcon(item.name, item.category);
            return (
              <div 
                key={item.id}
                className="flex items-center gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative"
              >
                <div className={`p-4 rounded-xl ${getStatusColor(item.status)} bg-opacity-30 border border-gray-100`}>
                  <ItemIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-bold truncate text-lg tracking-tight text-gray-900">{item.name}</h4>
                    <div className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded ${getStatusBadgeColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span className="font-mono">{item.barcodeId}</span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                    <span>{item.category}</span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                    <span className="text-gray-900">{item.department}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 text-right">
                  <div className="flex gap-1">
                    <button onClick={() => deleteItem(item.id, item.name)} className="p-2 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-200 hover:text-black hover:bg-gray-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                  {item.status !== 'available' && (
                    <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded text-[10px] font-black text-amber-600 uppercase tracking-tighter">
                       <div className="w-1 h-1 bg-amber-600 rounded-full" />
                       {item.holderName}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
             <Package className="w-16 h-16 text-gray-100 mx-auto mb-4" />
             <p className="text-gray-400 font-bold">No inventory matches your filters.</p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsAddModalOpen(false)}
               className="absolute inset-0 bg-[#F0F2F5]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] p-12 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white"
            >
               <div className="flex justify-between items-center mb-10">
                 <div>
                   <h3 className="text-3xl font-bold tracking-tight text-gray-900">New Item Entry</h3>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Assigning unique barcode signature</p>
                 </div>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-3 hover:bg-gray-50 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                 </button>
               </div>

               <form onSubmit={handleAddItem} className="space-y-8">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Asset Nomenclature</label>
                   <input 
                      required
                      placeholder="ENTER ITEM NAME"
                      className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm tracking-tight transition-all uppercase placeholder:font-normal placeholder:opacity-30"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Barcode ID</label>
                      <input 
                          required
                          placeholder="SCAN-0000"
                          className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black font-mono font-bold transition-all uppercase text-sm"
                          value={newBarcode}
                          onChange={(e) => setNewBarcode(e.target.value)}
                      />
                    </div>
                     <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sector Class</label>
                       <select 
                           className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm transition-all appearance-none uppercase"
                           value={newCategory}
                           onChange={(e) => setNewCategory(e.target.value)}
                       >
                         <option>Sports</option>
                         <option>Electronics</option>
                         <option>Tools</option>
                         <option>Media</option>
                       </select>
                     </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Department Attribution</label>
                    <select 
                        className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm transition-all appearance-none uppercase"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                    >
                      <option>Engineering</option>
                      <option>Design</option>
                      <option>Athletics</option>
                      <option>Arts</option>
                      <option>Education</option>
                    </select>
                  </div>

                 <div className="flex gap-4 pt-4">
                   <button 
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-5 text-gray-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-colors"
                   >
                     Void
                   </button>
                   <button 
                      type="submit"
                      disabled={isSaving}
                      className="flex-[2] py-5 bg-black text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-2xl hover:bg-neutral-800 transition-all disabled:opacity-50 active:scale-95"
                   >
                     {isSaving ? 'Processing...' : 'Secure and Register'}
                   </button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

