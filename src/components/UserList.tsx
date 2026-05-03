import { useState, useEffect, FormEvent } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Users, 
  Search, 
  UserPlus, 
  ChevronRight,
  Shield,
  CircleSmall,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole } from '../types';

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newDepartment, setNewDepartment] = useState('Engineering');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: User[] = [];
      snapshot.forEach((doc) => {
        userList.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(userList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName || !newBarcode) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'users'), {
        name: newName,
        barcodeId: newBarcode,
        role: newRole,
        department: newDepartment,
        checkedOutCount: 0,
        hasOverdue: false,
        createdAt: serverTimestamp(),
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

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.barcodeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Directory</h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{users.length} Registered Borrowers</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
            <input 
              type="text" 
              placeholder="Search directory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-0 focus:border-black transition-all text-sm font-medium"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-lg active:scale-95 transition-transform shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(n => <div key={n} className="h-32 bg-gray-100 animate-pulse rounded-2xl" />)
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div 
              key={user.id}
              className="flex items-center gap-5 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center relative border border-gray-100">
                <Users className="w-7 h-7 text-gray-300 group-hover:text-black transition-colors" />
                {user.hasOverdue && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full shadow-lg" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold flex items-center gap-2 text-lg tracking-tight text-gray-900 truncate">
                  {user.name}
                  {user.role === 'admin' && <Shield className="w-3 h-3 text-amber-500" />}
                </h4>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  <span className="font-mono">{user.barcodeId}</span>
                  <div className="w-1 h-1 bg-gray-200 rounded-full" />
                  <span>{user.role}</span>
                  <div className="w-1 h-1 bg-gray-200 rounded-full" />
                  <span>{user.department}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tracking-tighter text-gray-900">{user.checkedOutCount || 0}</p>
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">Active Items</p>
              </div>
              
              {user.hasOverdue && (
                <div className="absolute top-0 right-0 py-1 px-3 bg-rose-500 text-white text-[8px] font-bold uppercase tracking-widest rounded-bl-lg">
                  Overdue
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
             <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No records found matching search criteria.</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
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
                   <h3 className="text-3xl font-bold tracking-tight text-gray-900">Add New User</h3>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Registering authorized borrower</p>
                 </div>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-3 hover:bg-gray-50 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                 </button>
               </div>

               <form onSubmit={handleAddUser} className="space-y-8">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                   <input 
                      required
                      placeholder="ENTER FULL NAME"
                      className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm tracking-tight transition-all uppercase placeholder:font-normal placeholder:opacity-30"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">User ID / Barcode</label>
                      <input 
                          required
                          placeholder="ID-0000"
                          className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black font-mono font-bold transition-all uppercase text-sm"
                          value={newBarcode}
                          onChange={(e) => setNewBarcode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Access Level</label>
                      <select 
                          className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm transition-all appearance-none uppercase"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as UserRole)}
                      >
                        <option value="student">Student</option>
                        <option value="staff">Staff</option>
                        <option value="employee">Employee</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Department</label>
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
                     Cancel
                   </button>
                   <button 
                      type="submit"
                      disabled={isSaving}
                      className="flex-[2] py-5 bg-black text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-2xl hover:bg-neutral-800 transition-all disabled:opacity-50 active:scale-95"
                   >
                     {isSaving ? 'Processing...' : 'Register User'}
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
