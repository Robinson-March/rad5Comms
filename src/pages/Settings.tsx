// src/components/settings/SettingsModal.tsx
import { useState } from 'react';
import '../App.css';
import { X, 
  User,
  // Bell,
  // Shield,
  Camera,
  Mail,
  // Pencil,
  // Save,
  Loader2 
  } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Wisdom Ezeh',
    email: 'wisdom@example.com',
    bio: 'UI/UX Designer • Building better comms',
    lastSeen: 'everyone',
    profileVisibility: 'everyone',
    readReceipts: true,
    typingIndicators: true,
  });

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log('Saved settings:', formData);
    setIsSaving(false);
    // onClose(); // optional: close after save
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { name, value, type, checked } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="font-poppins fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Modal container */}
      <div className="bg-sidebar text-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 cursor-pointer rounded-full hover:bg-blue-600 transition"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 cursor-pointer text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-300 hover:text-gray-500'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-3 text-sm cursor-pointer font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-300 hover:text-gray-500'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-3 text-sm cursor-pointer font-medium transition-colors ${
              activeTab === 'privacy'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-300 hover:text-gray-500'
            }`}
          >
            Privacy
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scroll p-6 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-md">
                    {/* Replace with real image */}
                    <div className="w-full h-full bg-blue-300 flex items-center justify-center text-white text-2xl font-bold">
                      WE
                    </div>
                  </div>
                  <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition">
                    <Camera size={16} />
                  </button>
                </div>
                <button className="mt-3 text-sm text-white hover:underline">
                  Change profile picture
                </button>
              </div>

              {/* Form fields */}
              <div className="space-y-4 text-sm lg:text-normal">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Bio / Status</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 text-sm lg:text-normal">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">Message notifications</h3>
                  <p className="text-sm text-gray-500">Get notified for new messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">Group chat notifications</h3>
                  <p className="text-sm text-gray-500">For mentions and replies</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">Sound & vibration</h3>
                  <p className="text-sm text-gray-500">Play sound for new messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 text-sm lg:text-normal">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Who can see my last seen</label>
                <select
                  name="lastSeen"
                  value={formData.lastSeen}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-cyan-400"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Who can see my profile photo</label>
                <select
                  name="profileVisibility"
                  value={formData.profileVisibility}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 text-cyan-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">Read receipts</h3>
                  <p className="text-sm text-gray-500">Show when you've read messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="readReceipts"
                    checked={formData.readReceipts}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">Typing indicators</h3>
                  <p className="text-sm text-gray-500">Show when you're typing</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="typingIndicators"
                    checked={formData.typingIndicators}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3 text-sm lg:text-normal">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-300 hover:bg-red-600 cursor-pointer rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition disabled:opacity-70 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;