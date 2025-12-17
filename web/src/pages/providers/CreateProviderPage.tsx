/**
 * Create Provider Page
 * Form to onboard a new provider
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const providerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  legalName: z.string().min(2, 'Legal name is required'),
  taxId: z.string().min(5, 'Tax ID is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(5, 'Phone is required'),
  countryCode: z.string().length(2, 'Country code must be 2 characters'),
  businessUnit: z.string().min(2, 'Business unit is required'),
  externalId: z.string().min(2, 'External ID is required'),
});

type ProviderForm = z.infer<typeof providerSchema>;

export default function CreateProviderPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProviderForm>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      countryCode: 'FR',
      businessUnit: 'LM_FR',
    },
  });

  const onSubmit = async (data: ProviderForm) => {
    setIsSubmitting(true);
    try {
      console.log('Submitting provider data:', data);
      // TODO: Integrate with providerService.create(data)
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Provider created successfully');
      navigate('/operator/providers');
    } catch (error) {
      toast.error('Failed to create provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/operator/providers" className="text-gray-500 hover:text-gray-700 flex items-center mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Providers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Onboard New Provider</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
              <input
                {...register('name')}
                className="input w-full"
                placeholder="e.g. FastFix Paris"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
              <input
                {...register('legalName')}
                className="input w-full"
                placeholder="e.g. FastFix Paris SAS"
              />
              {errors.legalName && (
                <p className="text-red-500 text-xs mt-1">{errors.legalName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
              <input
                {...register('taxId')}
                className="input w-full"
                placeholder="e.g. FR123456789"
              />
              {errors.taxId && <p className="text-red-500 text-xs mt-1">{errors.taxId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">External ID</label>
              <input
                {...register('externalId')}
                className="input w-full"
                placeholder="e.g. PROV_001"
              />
              {errors.externalId && (
                <p className="text-red-500 text-xs mt-1">{errors.externalId.message}</p>
              )}
            </div>

            {/* Contact Info */}
            <div className="col-span-2 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Details</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input w-full"
                placeholder="contact@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                {...register('phone')}
                className="input w-full"
                placeholder="+33 1 23 45 67 89"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            {/* Context */}
            <div className="col-span-2 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Business Context</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select {...register('countryCode')} className="input w-full">
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="PL">Poland</option>
              </select>
              {errors.countryCode && (
                <p className="text-red-500 text-xs mt-1">{errors.countryCode.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Unit</label>
              <select {...register('businessUnit')} className="input w-full">
                <option value="LM_FR">DIY Store France</option>
                <option value="LM_ES">DIY Store Spain</option>
                <option value="LM_IT">DIY Store Italy</option>
                <option value="LM_PL">DIY Store Poland</option>
              </select>
              {errors.businessUnit && (
                <p className="text-red-500 text-xs mt-1">{errors.businessUnit.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/operator/providers')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Creating...' : 'Create Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
