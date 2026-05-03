import { Timestamp } from 'firebase/firestore';

export type ItemStatus = 'available' | 'checked_out' | 'overdue' | 'damaged' | 'lost';

export interface Item {
  id: string;
  name: string;
  category: string;
  department: string;
  barcodeId: string;
  status: ItemStatus;
  holderId?: string;
  holderName?: string;
  condition?: string;
  lastActionAt?: Timestamp;
  notes?: string;
  dueDate?: Timestamp;
}

export type UserRole = 'student' | 'staff' | 'employee' | 'admin';

export interface User {
  id: string;
  name: string;
  barcodeId: string;
  role: UserRole;
  department: string;
  email?: string;
  itemLimit?: number;
  checkedOutCount?: number;
  hasOverdue?: boolean;
}

export type ActionType = 'check_out' | 'check_in' | 'report_issue' | 'add_item' | 'update_item';

export interface Log {
  id: string;
  itemId: string;
  itemName?: string;
  userId?: string;
  userName?: string;
  action: ActionType;
  timestamp: Timestamp;
  details?: string;
}
