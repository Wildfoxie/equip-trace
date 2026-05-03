import { ItemStatus } from './types';
import { 
  Laptop, 
  Camera, 
  Smartphone, 
  Headphones, 
  Dribbble, 
  Terminal, 
  Telescope, 
  Music, 
  Cpu, 
  Package, 
  Zap,
  Gamepad2
} from 'lucide-react';

export const getStatusColor = (status: ItemStatus) => {
  switch (status) {
    case 'available': return 'bg-emerald-50 text-emerald-600';
    case 'checked_out': return 'bg-blue-50 text-blue-600';
    case 'overdue': return 'bg-rose-50 text-rose-600';
    case 'damaged':
    case 'lost': return 'bg-orange-50 text-orange-600';
    default: return 'bg-gray-50 text-gray-600';
  }
};

export const getStatusBadgeColor = (status: ItemStatus) => {
  switch (status) {
    case 'available': return 'bg-emerald-500 text-white';
    case 'checked_out': return 'bg-blue-500 text-white';
    case 'overdue': return 'bg-rose-500 text-white';
    case 'damaged':
    case 'lost': return 'bg-orange-500 text-white';
    default: return 'bg-gray-400 text-white';
  }
};

export const getItemIcon = (name: string, category?: string) => {
  const n = name.toLowerCase();
  const c = category?.toLowerCase();

  if (n.includes('mac') || n.includes('laptop')) return Laptop;
  if (n.includes('canon') || n.includes('camera') || n.includes('eos')) return Camera;
  if (n.includes('ipad') || n.includes('tablet')) return Smartphone;
  if (n.includes('sony') || n.includes('headphone') || n.includes('audio')) return Headphones;
  if (n.includes('basketball') || n.includes('football') || n.includes('spalding') || c === 'sports') return Dribbble;
  if (n.includes('arduino') || n.includes('stem') || n.includes('kit') || c === 'education') return Cpu;
  if (n.includes('telescope') || n.includes('sci')) return Telescope;
  if (n.includes('guitar') || n.includes('music') || c === 'arts') return Music;
  if (n.includes('drone') || n.includes('dji')) return Zap;
  if (n.includes('game') || n.includes('ps5') || n.includes('xbox')) return Gamepad2;
  if (n.includes('logic') || n.includes('tool')) return Terminal;

  return Package;
};
