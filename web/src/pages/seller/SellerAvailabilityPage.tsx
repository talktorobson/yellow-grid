/**
 * Seller Availability Page
 * Check provider availability for customer requests
 */

import { useState } from 'react';
import {
  MapPin,
  Clock,
  Search,
  CheckCircle,
  AlertTriangle,
  Building2,
  Star,
  ChevronDown,
  ChevronRight,
  Phone,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

interface ServiceType {
  id: string;
  name: string;
  category: string;
}

interface AvailableProvider {
  id: string;
  companyName: string;
  rating: number;
  distance: string;
  availableSlots: { date: string; slots: string[] }[];
  responseTime: string;
  completedJobs: number;
  services: string[];
}

const serviceTypes: ServiceType[] = [
  { id: 'elec', name: 'Électricité', category: 'Energy' },
  { id: 'plomb', name: 'Plomberie', category: 'Water' },
  { id: 'chauff', name: 'Chauffage', category: 'Energy' },
  { id: 'clim', name: 'Climatisation', category: 'Energy' },
  { id: 'isol', name: 'Isolation', category: 'Renovation' },
  { id: 'solar', name: 'Panneaux solaires', category: 'Energy' },
  { id: 'pac', name: 'Pompe à chaleur', category: 'Energy' },
  { id: 'chaud', name: 'Chaudière', category: 'Energy' },
];

const mockProviders: AvailableProvider[] = [
  {
    id: '1',
    companyName: 'Électricité Plus SARL',
    rating: 4.8,
    distance: '3.2 km',
    availableSlots: [
      { date: 'Mon 2 Dec', slots: ['09:00-12:00', '14:00-17:00'] },
      { date: 'Tue 3 Dec', slots: ['14:00-17:00'] },
      { date: 'Wed 4 Dec', slots: ['09:00-12:00', '14:00-17:00'] },
    ],
    responseTime: '< 2h',
    completedJobs: 342,
    services: ['Électricité', 'Domotique'],
  },
  {
    id: '2',
    companyName: 'Lyon Électrique Pro',
    rating: 4.6,
    distance: '5.8 km',
    availableSlots: [
      { date: 'Tue 3 Dec', slots: ['09:00-12:00'] },
      { date: 'Thu 5 Dec', slots: ['09:00-12:00', '14:00-17:00'] },
    ],
    responseTime: '< 4h',
    completedJobs: 189,
    services: ['Électricité'],
  },
  {
    id: '3',
    companyName: 'EcoEnergy Solutions',
    rating: 4.9,
    distance: '8.1 km',
    availableSlots: [
      { date: 'Wed 4 Dec', slots: ['14:00-17:00'] },
      { date: 'Fri 6 Dec', slots: ['09:00-12:00', '14:00-17:00'] },
    ],
    responseTime: '< 1h',
    completedJobs: 456,
    services: ['Électricité', 'Panneaux solaires', 'Pompe à chaleur'],
  },
];

export default function SellerAvailabilityPage() {
  const [selectedService, setSelectedService] = useState<string>('');
  const [postalCode, setPostalCode] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ providerId: string; date: string; slot: string } | null>(null);

  const handleSearch = () => {
    if (selectedService && postalCode) {
      setSearchPerformed(true);
      toast.success('Search completed - showing available providers');
    }
  };

  const handleContactProvider = (provider: AvailableProvider) => {
    toast.success(`Opening contact for ${provider.companyName}`);
    // In real implementation, this would open a contact modal or initiate a call
  };

  const handleBookSlot = () => {
    if (!selectedSlot) return;
    const provider = mockProviders.find(p => p.id === selectedSlot.providerId);
    toast.success(`Booking confirmed with ${provider?.companyName} for ${selectedSlot.date} at ${selectedSlot.slot}`);
    setSelectedSlot(null);
  };

  const handleToggleProvider = (providerId: string) => {
    setExpandedProvider(expandedProvider === providerId ? null : providerId);
  };

  const handleSelectSlot = (providerId: string, date: string, slot: string) => {
    const isSelected = selectedSlot?.providerId === providerId && 
      selectedSlot?.date === date && 
      selectedSlot?.slot === slot;
    setSelectedSlot(isSelected ? null : { providerId, date, slot });
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Check Provider Availability</h2>
        
        <div className="grid md:grid-cols-4 gap-4">
          {/* Service Selection */}
          <div className="md:col-span-2">
            <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-2">
              Service Type
            </label>
            <div className="relative">
              <select
                id="serviceType"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white"
              >
                <option value="">Select a service...</option>
                {serviceTypes.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Postal Code */}
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
              Postal Code
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="postalCode"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="69001"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          
          {/* Search Button */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={!selectedService || !postalCode}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Check Availability
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searchPerformed && (
        <>
          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">
                  {mockProviders.length} providers available
                </div>
                <div className="text-sm text-green-700">
                  For {serviceTypes.find(s => s.id === selectedService)?.name} in {postalCode}
                </div>
              </div>
            </div>
          </div>

          {/* Provider List */}
          <div className="space-y-4">
            {mockProviders.map(provider => (
              <div
                key={provider.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => handleToggleProvider(provider.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{provider.companyName}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            {provider.rating}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {provider.distance}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {provider.responseTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Next Available</div>
                        <div className="font-medium text-green-600">
                          {provider.availableSlots[0].date}
                        </div>
                      </div>
                      <ChevronRight className={clsx(
                        'w-5 h-5 text-gray-400 transition-transform',
                        expandedProvider === provider.id && 'rotate-90'
                      )} />
                    </div>
                  </div>
                </button>

                {expandedProvider === provider.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Provider Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Provider Info</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {provider.completedJobs} jobs completed
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {provider.services.map(service => (
                              <span key={service} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleContactProvider(provider)}
                          className="mt-4 w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <Phone className="w-4 h-4" />
                          Contact Provider
                        </button>
                      </div>

                      {/* Available Slots */}
                      <div className="md:col-span-2">
                        <h4 className="font-medium text-gray-900 mb-2">Available Slots</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {provider.availableSlots.map(day => (
                            <div key={day.date} className="bg-white rounded-lg border border-gray-200 p-3">
                              <div className="font-medium text-gray-900 text-sm mb-2">{day.date}</div>
                              <div className="space-y-1">
                                {day.slots.map(slot => {
                                  const isSelected = selectedSlot?.providerId === provider.id &&
                                    selectedSlot?.date === day.date &&
                                    selectedSlot?.slot === slot;
                                    
                                  return (
                                    <button
                                      key={slot}
                                      onClick={() => handleSelectSlot(provider.id, day.date, slot)}
                                      className={clsx(
                                        'w-full py-1.5 px-2 rounded text-xs font-medium transition-all',
                                        isSelected
                                          ? 'bg-green-600 text-white'
                                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                                      )}
                                    >
                                      {slot}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {selectedSlot?.providerId === provider.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Selected: <span className="font-medium text-gray-900">
                              {selectedSlot.date} at {selectedSlot.slot}
                            </span>
                          </div>
                          <button 
                            onClick={handleBookSlot}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            Book This Slot
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* No Results Fallback */}
          {mockProviders.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="font-semibold text-yellow-800 mb-2">
                No providers available
              </h3>
              <p className="text-yellow-700 text-sm">
                There are no available providers for this service in this area.
                Try a different postal code or contact support.
              </p>
            </div>
          )}
        </>
      )}

      {/* Instructions */}
      {!searchPerformed && (
        <div className="bg-blue-50 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to use this tool</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-700">1</span>
              <span>Select the service type the customer needs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-700">2</span>
              <span>Enter the customer's postal code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-700">3</span>
              <span>View available providers and their time slots</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-700">4</span>
              <span>Book a slot that works for the customer</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
