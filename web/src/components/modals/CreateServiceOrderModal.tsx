/**
 * Create Service Order Modal
 * Modal for creating new service orders with full form
 */

import { useState } from 'react';
import { X, Plus, Calendar, User, MapPin, FileText } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serviceOrderService } from '@/services/service-order-service';
import { catalogService } from '@/services/catalog-service';
import { toast } from 'sonner';
import clsx from 'clsx';

interface CreateServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

type ServiceType = 'INSTALLATION' | 'REPAIR' | 'MAINTENANCE' | 'TECHNICAL_VISIT' | 'QUOTATION';
type Urgency = 'URGENT' | 'STANDARD' | 'LOW';

interface FormData {
  // Customer Info
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerStreet: string;
  customerCity: string;
  customerPostalCode: string;
  customerCountry: string;
  // Service Info
  serviceId: string;
  serviceType: ServiceType;
  urgency: Urgency;
  estimatedDurationMinutes: number;
  // Service Address (can be different from customer address)
  sameAsCustomerAddress: boolean;
  serviceStreet: string;
  serviceCity: string;
  servicePostalCode: string;
  // Scheduling
  requestedStartDate: string;
  requestedEndDate: string;
  requestedTimeSlot: string;
  // Context
  countryCode: string;
  businessUnit: string;
  salesmanNotes: string;
  externalServiceOrderId: string;
}

const initialFormData: FormData = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerStreet: '',
  customerCity: '',
  customerPostalCode: '',
  customerCountry: 'ES',
  serviceId: '',
  serviceType: 'INSTALLATION',
  urgency: 'STANDARD',
  estimatedDurationMinutes: 120,
  sameAsCustomerAddress: true,
  serviceStreet: '',
  serviceCity: '',
  servicePostalCode: '',
  requestedStartDate: '',
  requestedEndDate: '',
  requestedTimeSlot: 'AM',
  countryCode: 'ES',
  businessUnit: 'LEROY_MERLIN',
  salesmanNotes: '',
  externalServiceOrderId: '',
};

export function CreateServiceOrderModal({ isOpen, onClose, onSuccess }: CreateServiceOrderModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [step, setStep] = useState(1);
  const queryClient = useQueryClient();

  // Fetch available services from catalog
  const { data: servicesData } = useQuery({
    queryKey: ['catalog-services'],
    queryFn: () => catalogService.getAll(),
    enabled: isOpen,
  });
  const services = servicesData?.data || [];

  const createMutation = useMutation({
    mutationFn: () => {
      const serviceAddress = formData.sameAsCustomerAddress
        ? {
            street: formData.customerStreet,
            city: formData.customerCity,
            postalCode: formData.customerPostalCode,
          }
        : {
            street: formData.serviceStreet,
            city: formData.serviceCity,
            postalCode: formData.servicePostalCode,
          };

      return serviceOrderService.create({
        serviceId: formData.serviceId || services[0]?.id || 'default-service-id',
        countryCode: formData.countryCode,
        businessUnit: formData.businessUnit,
        customerInfo: {
          name: formData.customerName,
          email: formData.customerEmail || undefined,
          phone: formData.customerPhone || undefined,
          address: {
            street: formData.customerStreet,
            city: formData.customerCity,
            postalCode: formData.customerPostalCode,
            country: formData.customerCountry,
          },
        },
        serviceType: formData.serviceType,
        urgency: formData.urgency,
        estimatedDurationMinutes: formData.estimatedDurationMinutes,
        serviceAddress,
        requestedStartDate: new Date(formData.requestedStartDate).toISOString(),
        requestedEndDate: new Date(formData.requestedEndDate).toISOString(),
        requestedTimeSlot: formData.requestedTimeSlot || undefined,
        externalServiceOrderId: formData.externalServiceOrderId || undefined,
        salesmanNotes: formData.salesmanNotes || undefined,
      });
    },
    onSuccess: (data) => {
      toast.success('Service order created successfully');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setFormData(initialFormData);
      setStep(1);
      onClose();
      if (onSuccess) {
        onSuccess(data.id);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create service order');
    },
  });

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.customerName && formData.customerStreet && formData.customerCity && formData.customerPostalCode);
      case 2:
        return !!(formData.serviceType && formData.urgency);
      case 3:
        return !!(formData.requestedStartDate && formData.requestedEndDate);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (validateStep(1) && validateStep(2) && validateStep(3)) {
      createMutation.mutate();
    } else {
      toast.error('Please complete all required fields');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Service Order</h2>
              <p className="text-sm text-gray-500 mt-1">
                Step {step} of 4 - {step === 1 ? 'Customer Info' : step === 2 ? 'Service Details' : step === 3 ? 'Scheduling' : 'Review & Confirm'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicators */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      s === step
                        ? 'bg-green-600 text-white'
                        : s < step
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {s < step ? '✓' : s}
                  </div>
                  {s < 4 && (
                    <div
                      className={clsx(
                        'w-16 h-1 mx-2',
                        s < step ? 'bg-green-400' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Customer Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700 mb-4">
                  <User className="w-5 h-5" />
                  <h3 className="font-medium">Customer Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="e.g., Jean Dupont"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="input w-full"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      placeholder="customer@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="input w-full"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-700 mt-6 mb-4">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-medium">Customer Address</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    value={formData.customerStreet}
                    onChange={(e) => handleInputChange('customerStreet', e.target.value)}
                    placeholder="123 Rue de la Paix"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={formData.customerCity}
                      onChange={(e) => handleInputChange('customerCity', e.target.value)}
                      placeholder="Paris"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={formData.customerPostalCode}
                      onChange={(e) => handleInputChange('customerPostalCode', e.target.value)}
                      placeholder="75001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select
                      className="input w-full"
                      value={formData.customerCountry}
                      onChange={(e) => handleInputChange('customerCountry', e.target.value)}
                    >
                      <option value="ES">Spain</option>
                      <option value="FR">France</option>
                      <option value="IT">Italy</option>
                      <option value="PL">Poland</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Service Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700 mb-4">
                  <FileText className="w-5 h-5" />
                  <h3 className="font-medium">Service Details</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input w-full"
                      value={formData.serviceType}
                      onChange={(e) => handleInputChange('serviceType', e.target.value as ServiceType)}
                    >
                      <option value="INSTALLATION">Installation</option>
                      <option value="REPAIR">Repair</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="TECHNICAL_VISIT">Technical Visit</option>
                      <option value="QUOTATION">Quotation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Urgency <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input w-full"
                      value={formData.urgency}
                      onChange={(e) => handleInputChange('urgency', e.target.value as Urgency)}
                    >
                      <option value="URGENT">Urgent (24-48h)</option>
                      <option value="STANDARD">Standard (3-7 days)</option>
                      <option value="LOW">Low (flexible)</option>
                    </select>
                  </div>
                </div>

                {services.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Catalog
                    </label>
                    <select
                      className="input w-full"
                      value={formData.serviceId}
                      onChange={(e) => handleInputChange('serviceId', e.target.value)}
                    >
                      <option value="">Select a service...</option>
                      {services.map((service: any) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - {service.code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Duration (minutes)
                  </label>
                  <input
                    type="number"
                    className="input w-full"
                    value={formData.estimatedDurationMinutes}
                    onChange={(e) => handleInputChange('estimatedDurationMinutes', parseInt(e.target.value) || 60)}
                    min={15}
                    step={15}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select
                      className="input w-full"
                      value={formData.countryCode}
                      onChange={(e) => {
                        handleInputChange('countryCode', e.target.value);
                        handleInputChange('customerCountry', e.target.value);
                      }}
                    >
                      <option value="ES">Spain</option>
                      <option value="FR">France</option>
                      <option value="IT">Italy</option>
                      <option value="PL">Poland</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Unit</label>
                    <select
                      className="input w-full"
                      value={formData.businessUnit}
                      onChange={(e) => handleInputChange('businessUnit', e.target.value)}
                    >
                      <option value="LEROY_MERLIN">Leroy Merlin</option>
                      <option value="AKI">AKI</option>
                      <option value="WELDOM">Weldom</option>
                      <option value="BRICOMAN">Bricoman</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.sameAsCustomerAddress}
                      onChange={(e) => handleInputChange('sameAsCustomerAddress', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Service address same as customer address
                  </label>
                </div>

                {!formData.sameAsCustomerAddress && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700">Service Address</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={formData.serviceStreet}
                        onChange={(e) => handleInputChange('serviceStreet', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          className="input w-full"
                          value={formData.serviceCity}
                          onChange={(e) => handleInputChange('serviceCity', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          className="input w-full"
                          value={formData.servicePostalCode}
                          onChange={(e) => handleInputChange('servicePostalCode', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (for AI analysis)</label>
                  <textarea
                    className="input w-full"
                    rows={3}
                    value={formData.salesmanNotes}
                    onChange={(e) => handleInputChange('salesmanNotes', e.target.value)}
                    placeholder="Any special requirements, customer preferences, or sales notes..."
                  />
                </div>
              </div>
            )}

            {/* Step 3: Scheduling */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700 mb-4">
                  <Calendar className="w-5 h-5" />
                  <h3 className="font-medium">Scheduling</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Earliest Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={formData.requestedStartDate}
                      onChange={(e) => handleInputChange('requestedStartDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latest Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={formData.requestedEndDate}
                      onChange={(e) => handleInputChange('requestedEndDate', e.target.value)}
                      min={formData.requestedStartDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time Slot</label>
                  <select
                    className="input w-full"
                    value={formData.requestedTimeSlot}
                    onChange={(e) => handleInputChange('requestedTimeSlot', e.target.value)}
                  >
                    <option value="">No preference</option>
                    <option value="AM">Morning (8:00 - 12:00)</option>
                    <option value="PM">Afternoon (14:00 - 18:00)</option>
                    <option value="FULL_DAY">Full Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">External Order ID (optional)</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={formData.externalServiceOrderId}
                    onChange={(e) => handleInputChange('externalServiceOrderId', e.target.value)}
                    placeholder="e.g., PYXIS-ES-12345"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review & Confirm */}
            {step === 4 && (
              <div className="space-y-6">
                <h3 className="font-medium text-gray-700">Review Order Details</h3>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Customer</h4>
                    <p className="text-gray-900">{formData.customerName}</p>
                    <p className="text-sm text-gray-600">{formData.customerEmail} • {formData.customerPhone}</p>
                    <p className="text-sm text-gray-600">
                      {formData.customerStreet}, {formData.customerCity} {formData.customerPostalCode}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-500">Service</h4>
                    <p className="text-gray-900">{formData.serviceType.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600">
                      Urgency: {formData.urgency} • Duration: {formData.estimatedDurationMinutes} min
                    </p>
                    <p className="text-sm text-gray-600">
                      {formData.countryCode} • {formData.businessUnit.replace('_', ' ')}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-500">Schedule</h4>
                    <p className="text-gray-900">
                      {formData.requestedStartDate} to {formData.requestedEndDate}
                    </p>
                    <p className="text-sm text-gray-600">
                      Preferred: {formData.requestedTimeSlot || 'No preference'}
                    </p>
                  </div>

                  {formData.salesmanNotes && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                      <p className="text-sm text-gray-600">{formData.salesmanNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={step === 1 ? onClose : handleBack}
              className="btn btn-secondary"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="btn btn-primary"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="btn btn-primary flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Service Order
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
