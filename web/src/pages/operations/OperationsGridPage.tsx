/**
 * Operations Grid Page
 * Weekly view of all providers/teams and their scheduled service slots
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OperationsGrid } from '@/components/grid';
import type { GridRow, ScheduledSlot } from '@/components/grid';

// Mock data for development
const mockGridRows: GridRow[] = [
  {
    id: 'provider-1',
    type: 'provider',
    name: 'Servicios Integrales SA',
    capacity: 4,
    skills: ['plumbing', 'electrical', 'hvac'],
    slots: {
      [new Date().toISOString().split('T')[0]]: [
        {
          id: 'slot-1',
          serviceOrderRef: 'SO-2024-001',
          serviceType: 'Plumbing Repair',
          customerName: 'Marie Dupont',
          timeSlot: 'morning',
          status: 'scheduled',
          estimatedDuration: 2,
          address: '123 Main St',
        },
        {
          id: 'slot-2',
          serviceOrderRef: 'SO-2024-002',
          serviceType: 'Electrical',
          customerName: 'Jean Martin',
          timeSlot: 'afternoon',
          status: 'in_progress',
          estimatedDuration: 3,
          priority: 'urgent',
        },
      ],
      [getTomorrowDate()]: [
        {
          id: 'slot-3',
          serviceOrderRef: 'SO-2024-003',
          serviceType: 'HVAC Maintenance',
          customerName: 'Sophie Bernard',
          timeSlot: 'morning',
          status: 'scheduled',
          estimatedDuration: 4,
        },
      ],
    },
  },
  {
    id: 'team-1',
    type: 'work_team',
    name: 'Equipo Norte',
    providerName: 'Servicios Integrales SA',
    capacity: 3,
    skills: ['plumbing'],
    slots: {
      [new Date().toISOString().split('T')[0]]: [
        {
          id: 'slot-4',
          serviceOrderRef: 'SO-2024-004',
          serviceType: 'Plumbing Installation',
          customerName: 'Philippe Robert',
          timeSlot: 'morning',
          status: 'completed',
          estimatedDuration: 2,
        },
      ],
      [getTomorrowDate()]: [
        {
          id: 'slot-5',
          serviceOrderRef: 'SO-2024-005',
          serviceType: 'Water Heater',
          customerName: 'Isabelle Dubois',
          timeSlot: 'afternoon',
          status: 'scheduled',
          estimatedDuration: 3,
        },
      ],
    },
  },
  {
    id: 'team-2',
    type: 'work_team',
    name: 'Equipo Sur',
    providerName: 'Servicios Integrales SA',
    capacity: 3,
    skills: ['electrical', 'hvac'],
    slots: {
      [new Date().toISOString().split('T')[0]]: [
        {
          id: 'slot-6',
          serviceOrderRef: 'SO-2024-006',
          serviceType: 'AC Installation',
          customerName: 'Marc Leblanc',
          timeSlot: 'morning',
          status: 'delayed',
          estimatedDuration: 5,
          priority: 'urgent',
        },
      ],
    },
  },
  {
    id: 'provider-2',
    type: 'provider',
    name: 'ElectroTech Solutions',
    capacity: 2,
    skills: ['electrical'],
    slots: {
      [getDateOffset(2)]: [
        {
          id: 'slot-7',
          serviceOrderRef: 'SO-2024-007',
          serviceType: 'Electrical Panel',
          customerName: 'Anne Moreau',
          timeSlot: 'morning',
          status: 'scheduled',
          estimatedDuration: 4,
        },
      ],
    },
  },
];

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function getDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export default function OperationsGridPage() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);

  const handleSlotClick = (slot: ScheduledSlot, row: GridRow) => {
    // Navigate to service order detail
    console.log('Slot clicked:', slot, row);
    navigate(`/operator/orders`);
  };

  const handleCreateSlot = (date: string, row: GridRow) => {
    // Open assignment modal
    console.log('Create slot for:', date, row);
    navigate('/operator/orders');
  };

  const handleRowClick = (row: GridRow) => {
    // Navigate to provider/team detail
    if (row.type === 'provider') {
      navigate('/operator/providers');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Grid</h1>
          <p className="text-gray-500 mt-0.5">
            Weekly schedule overview for all providers and teams
          </p>
        </div>
      </div>

      {/* Grid */}
      <OperationsGrid
        rows={mockGridRows}
        weekOffset={weekOffset}
        onWeekChange={setWeekOffset}
        onSlotClick={handleSlotClick}
        onCreateSlot={handleCreateSlot}
        onRowClick={handleRowClick}
      />

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-200 border border-green-300" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-200 border border-orange-300" />
          <span>Delayed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-200 border border-red-300" />
          <span>Cancelled</span>
        </div>
      </div>
    </div>
  );
}
