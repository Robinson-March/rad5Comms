/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/settings/SettingsModal.tsx
import { useEffect, useRef, useState } from 'react';
import '../App.css';
import { Camera, Loader2, Mail, User, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type SettingsTab = 'profile' | 'notifications' | 'privacy';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: SettingsTab;
}

const switchTrackClass =
  'relative h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-blue peer-focus:ring-4 peer-focus:ring-blue/20';
const switchThumbClass =
  "after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-slate-200 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5";
const inputClass =
  'w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/70 focus:border-blue/30 focus:ring-4 focus:ring-blue/10';
const labelClass = 'mb-2 block text-sm font-medium text-text-primary';

const SettingsModal = ({ isOpen, onClose, defaultTab = 'profile' }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    lastSeen: 'everyone',
    profileVisibility: 'everyone',
    readReceipts: true,
    typingIndicators: true,
    messageNotifications: true,
    groupNotifications: true,
    soundVibration: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token');
        }

        const res = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data?.user || res.data;

        setAvatarFile(null);
        setAvatarPreview(user.avatar || null);
        objectUrlRef.current = null;

        setFormData({
          name: user.name || '',
          email: user.email || '',
          bio: user.bio || '',
          lastSeen: user.lastSeen || 'everyone',
          profileVisibility: user.profileVisibility || 'everyone',
          readReceipts: user.readReceipts ?? true,
          typingIndicators: user.typingIndicators ?? true,
          messageNotifications: user.notificationSettings?.messages ?? true,
          groupNotifications: user.notificationSettings?.groups ?? true,
          soundVibration: user.notificationSettings?.sounds ?? true,
        });
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in');
      setIsSaving(false);
      return;
    }

    try {
      if (activeTab === 'profile') {
        await axios.put(
          `${API_BASE_URL}/users/profile`,
          { name: formData.name, email: formData.email, bio: formData.bio },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (avatarFile) {
          const formDataAvatar = new FormData();
          formDataAvatar.append('avatar', avatarFile);
          await axios.put(`${API_BASE_URL}/users/avatar`, formDataAvatar, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          });
          toast.success('Profile picture updated');
        }

        toast.success('Profile updated');
        window.dispatchEvent(
          new CustomEvent('profile-updated', {
            detail: { name: formData.name, avatar: avatarPreview || null },
          })
        );
      } else if (activeTab === 'privacy') {
        await axios.put(
          `${API_BASE_URL}/users/privacy`,
          {
            lastSeen: formData.lastSeen,
            profileVisibility: formData.profileVisibility,
            readReceipts: formData.readReceipts,
            typingIndicators: formData.typingIndicators,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Privacy settings updated');
      } else {
        await axios.put(
          `${API_BASE_URL}/users/notifications`,
          {
            messages: formData.messageNotifications,
            groups: formData.groupNotifications,
            sounds: formData.soundVibration,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Notification settings updated');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="font-poppins fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md">
      <div className="animate-pop-in flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white/95 shadow-[0_32px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">Settings</h2>
            <p className="mt-1 text-sm text-text-secondary">Manage your profile, notifications, and privacy.</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-panel-muted text-text-secondary transition duration-300 hover:-translate-y-0.5 hover:border-blue/30 hover:bg-blue-soft hover:text-blue cursor-pointer"
            type="button"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border/80 px-4 py-3">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-panel-muted p-1">
            {(['profile', 'notifications', 'privacy'] as SettingsTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-4 py-3 text-sm font-medium capitalize transition duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-white text-text-primary shadow-[0_14px_28px_rgba(148,163,184,0.18)]'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  type="button"
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        <div className="scroll flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center text-text-secondary">
              <Loader2 className="h-8 w-8 animate-spin text-blue" />
              <p className="mt-4 text-sm">Loading your settings...</p>
            </div>
          ) : (
            <>
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-border bg-panel-muted/70 p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-blue-soft text-3xl font-semibold text-blue shadow-[0_20px_40px_rgba(37,99,235,0.16)]">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            formData.name?.charAt(0)?.toUpperCase() || 'U'
                          )}
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-1 right-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue text-white shadow-[0_14px_28px_rgba(37,99,235,0.28)] transition duration-300 hover:scale-[1.03] hover:bg-blue-dark cursor-pointer"
                          type="button"
                          aria-label="Change profile picture"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) {
                              return;
                            }

                            if (objectUrlRef.current) {
                              URL.revokeObjectURL(objectUrlRef.current);
                            }

                            const previewUrl = URL.createObjectURL(file);
                            objectUrlRef.current = previewUrl;
                            setAvatarFile(file);
                            setAvatarPreview(previewUrl);
                          }}
                        />
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 text-sm font-medium text-blue transition hover:text-blue-dark cursor-pointer"
                        type="button"
                      >
                        Change profile picture
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                        <input
                          name="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`${inputClass} pl-11`}
                          placeholder="Your full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Email</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                        <input
                          name="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`${inputClass} pl-11`}
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Bio / Status</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={4}
                        className={`${inputClass} resize-none`}
                        placeholder="Tell people a little about yourself"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-border bg-panel p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">Message notifications</h3>
                        <p className="mt-1 text-sm text-text-secondary">Get notified when someone messages you directly.</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          name="messageNotifications"
                          checked={formData.messageNotifications}
                          onChange={(e) => setFormData({ ...formData, messageNotifications: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className={`${switchTrackClass} ${switchThumbClass}`} />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-border bg-panel p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">Group chat notifications</h3>
                        <p className="mt-1 text-sm text-text-secondary">Stay on top of mentions, replies, and team updates.</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          name="groupNotifications"
                          checked={formData.groupNotifications}
                          onChange={(e) => setFormData({ ...formData, groupNotifications: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className={`${switchTrackClass} ${switchThumbClass}`} />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-border bg-panel p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">Sound and vibration</h3>
                        <p className="mt-1 text-sm text-text-secondary">Play a sound when new activity comes in.</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          name="soundVibration"
                          checked={formData.soundVibration}
                          onChange={(e) => setFormData({ ...formData, soundVibration: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className={`${switchTrackClass} ${switchThumbClass}`} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-border bg-panel p-5">
                    <label className={labelClass}>Who can see my last seen</label>
                    <select
                      name="lastSeen"
                      value={formData.lastSeen}
                      onChange={(e) => setFormData({ ...formData, lastSeen: e.target.value })}
                      className={inputClass}
                    >
                      <option value="everyone">Everyone</option>
                      <option value="contacts">My contacts</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>

                  <div className="rounded-[24px] border border-border bg-panel p-5">
                    <label className={labelClass}>Who can see my profile photo</label>
                    <select
                      name="profileVisibility"
                      value={formData.profileVisibility}
                      onChange={(e) => setFormData({ ...formData, profileVisibility: e.target.value })}
                      className={inputClass}
                    >
                      <option value="everyone">Everyone</option>
                      <option value="contacts">My contacts</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>

                  <div className="rounded-[24px] border border-border bg-panel p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">Read receipts</h3>
                        <p className="mt-1 text-sm text-text-secondary">Show when you have read messages.</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          name="readReceipts"
                          checked={formData.readReceipts}
                          onChange={(e) => setFormData({ ...formData, readReceipts: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className={`${switchTrackClass} ${switchThumbClass}`} />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-border bg-panel p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">Typing indicators</h3>
                        <p className="mt-1 text-sm text-text-secondary">Let people know when you are typing.</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          name="typingIndicators"
                          checked={formData.typingIndicators}
                          onChange={(e) => setFormData({ ...formData, typingIndicators: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className={`${switchTrackClass} ${switchThumbClass}`} />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/80 bg-white/80 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-panel px-5 py-2.5 text-sm font-medium text-text-secondary transition duration-300 hover:border-blue/30 hover:text-text-primary cursor-pointer"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue to-blue-dark px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            type="button"
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
