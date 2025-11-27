/**
 * Provider Settings Page
 * 
 * Manage provider profile, preferences, notification settings, and team configuration.
 */

import { useState } from 'react';
import { Save, User, Bell, Shield, MapPin, Clock, Users, CreditCard, Building } from 'lucide-react';
import clsx from 'clsx';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

const initialNotifications: NotificationSetting[] = [
  { id: 'new_job', label: 'New Job Requests', description: 'Receive notifications when new jobs are assigned', email: true, push: true, sms: true },
  { id: 'job_update', label: 'Job Updates', description: 'Updates on job status changes', email: true, push: true, sms: false },
  { id: 'schedule', label: 'Schedule Changes', description: 'Notifications about schedule modifications', email: true, push: true, sms: false },
  { id: 'payment', label: 'Payment Received', description: 'Notifications when payments are processed', email: true, push: false, sms: false },
  { id: 'review', label: 'New Reviews', description: 'When customers leave feedback', email: true, push: true, sms: false },
];

export default function ProviderSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'availability' | 'billing' | 'security'>('profile');
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'availability', label: 'Availability', icon: Clock },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
  ] as const;

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const toggleNotification = (id: string, channel: 'email' | 'push' | 'sms') => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, [channel]: !n[channel] } : n
    ));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account preferences and configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="card p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                  activeTab === tab.id 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Company Profile</h2>
                <p className="text-sm text-gray-600">Manage your business information</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Company Logo */}
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Building className="w-10 h-10 text-primary-600" />
                  </div>
                  <div>
                    <button className="btn btn-secondary text-sm">Upload Logo</button>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Électricité Pro Paris"
                    className="input w-full"
                  />
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      defaultValue="+33 1 42 36 78 90"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue="contact@electricite-pro.fr"
                      className="input w-full"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Address
                  </label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      defaultValue="45 Avenue des Champs-Élysées, 75008 Paris"
                      className="input flex-1"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Description
                  </label>
                  <textarea
                    rows={4}
                    defaultValue="Expert en installation et maintenance électrique depuis 15 ans. Spécialisé dans les installations résidentielles et commerciales."
                    className="input w-full"
                  />
                </div>

                {/* Service Zones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Zones
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Paris 15e', 'Paris 16e', 'Paris 8e', 'Boulogne-Billancourt', 'Issy-les-Moulineaux'].map(zone => (
                      <span key={zone} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                        {zone}
                      </span>
                    ))}
                    <button className="px-3 py-1 border border-dashed border-gray-300 rounded-full text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600">
                      + Add Zone
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Notification Preferences</h2>
                <p className="text-sm text-gray-600">Choose how you want to be notified</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
                  <div></div>
                  <div className="text-center text-sm font-medium text-gray-600">Email</div>
                  <div className="text-center text-sm font-medium text-gray-600">Push</div>
                  <div className="text-center text-sm font-medium text-gray-600">SMS</div>
                </div>
                {notifications.map(notification => (
                  <div key={notification.id} className="grid grid-cols-4 gap-4 py-4 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{notification.label}</p>
                      <p className="text-sm text-gray-500">{notification.description}</p>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => toggleNotification(notification.id, 'email')}
                        className={clsx(
                          'w-10 h-6 rounded-full transition-colors relative',
                          notification.email ? 'bg-primary-600' : 'bg-gray-300'
                        )}
                      >
                        <div className={clsx(
                          'absolute w-4 h-4 bg-white rounded-full top-1 transition-all',
                          notification.email ? 'right-1' : 'left-1'
                        )} />
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => toggleNotification(notification.id, 'push')}
                        className={clsx(
                          'w-10 h-6 rounded-full transition-colors relative',
                          notification.push ? 'bg-primary-600' : 'bg-gray-300'
                        )}
                      >
                        <div className={clsx(
                          'absolute w-4 h-4 bg-white rounded-full top-1 transition-all',
                          notification.push ? 'right-1' : 'left-1'
                        )} />
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => toggleNotification(notification.id, 'sms')}
                        className={clsx(
                          'w-10 h-6 rounded-full transition-colors relative',
                          notification.sms ? 'bg-primary-600' : 'bg-gray-300'
                        )}
                      >
                        <div className={clsx(
                          'absolute w-4 h-4 bg-white rounded-full top-1 transition-all',
                          notification.sms ? 'right-1' : 'left-1'
                        )} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Working Hours</h2>
                <p className="text-sm text-gray-600">Set your availability for job scheduling</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, idx) => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-24">
                        <span className="font-medium">{day}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          defaultChecked={idx < 5}
                          className="w-4 h-4 text-primary-600"
                        />
                        <span className="text-sm text-gray-600">Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          defaultValue="08:00"
                          disabled={idx >= 5}
                          className="input w-28 text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          defaultValue="18:00"
                          disabled={idx >= 5}
                          className="input w-28 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Capacity
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Concurrent Jobs
                      </label>
                      <input
                        type="number"
                        defaultValue={4}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buffer Time Between Jobs
                      </label>
                      <select className="input w-full">
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Billing Information</h2>
                <p className="text-sm text-gray-600">Manage payment methods and invoicing</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Bank Details */}
                <div>
                  <h3 className="font-medium mb-4">Bank Account</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                        <input
                          type="text"
                          defaultValue="FR76 3000 4000 0500 0000 1234 567"
                          className="input w-full font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">BIC</label>
                        <input
                          type="text"
                          defaultValue="BNPAFRPP"
                          className="input w-full font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Settings */}
                <div>
                  <h3 className="font-medium mb-4">Invoice Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                      <input
                        type="text"
                        defaultValue="FR 12 345678901"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                      <select className="input w-full">
                        <option value="0">Immediate</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Security Settings</h2>
                <p className="text-sm text-gray-600">Manage your account security</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Change Password */}
                <div>
                  <h3 className="font-medium mb-4">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <input type="password" className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input type="password" className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input type="password" className="input w-full" />
                    </div>
                    <button className="btn btn-primary">Update Password</button>
                  </div>
                </div>

                {/* Two Factor */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-600">Add an extra layer of security</p>
                    </div>
                    <button className="btn btn-secondary">Enable 2FA</button>
                  </div>
                </div>

                {/* Sessions */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-medium mb-4">Active Sessions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Chrome on MacOS</p>
                        <p className="text-sm text-gray-500">Paris, France • Current session</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Yellow Grid Mobile App</p>
                        <p className="text-sm text-gray-500">iPhone 14 Pro • Last active 2 hours ago</p>
                      </div>
                      <button className="text-sm text-red-600 hover:text-red-700">Revoke</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
