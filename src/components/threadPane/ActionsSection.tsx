/* eslint-disable @typescript-eslint/no-explicit-any */
// components/threadPane/ActionsSection.tsx
import { Ban, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ActionsSectionProps {
  isGroup: boolean;
  chatId: string;
  onActionSuccess: () => void;
}

const ActionsSection = ({ isGroup, chatId, onActionSuccess }: ActionsSectionProps) => {
  const navigate = useNavigate();

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear all messages in this chat? This cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/dms/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Chat cleared');
      onActionSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to clear chat');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/channels/${chatId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('You have left the group');
      onActionSuccess();
      navigate('/home');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This will remove all members and messages permanently.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/channels/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Group deleted');
      onActionSuccess();
      navigate('/home');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete group');
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-text-secondary">Actions</h4>
      {!isGroup ? (
        <button
          onClick={handleClearChat}
          className="flex w-full items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-left text-sm font-medium text-light-red transition hover:bg-red-100 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Clear chat history
        </button>
      ) : (
        <>
          <button
            onClick={handleLeaveGroup}
            className="flex w-full items-center gap-3 rounded-2xl bg-panel-muted px-4 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-panel-strong cursor-pointer"
          >
            <Ban className="h-4 w-4 text-warning" />
            Leave group
          </button>
          <button
            onClick={handleDeleteGroup}
            className="flex w-full items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-left text-sm font-medium text-light-red transition hover:bg-red-100 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Delete group
          </button>
        </>
      )}
    </div>
  );
};

export default ActionsSection;
