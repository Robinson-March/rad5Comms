/* eslint-disable @typescript-eslint/no-explicit-any */
// components/main/MessageInput.tsx
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bold,
  Code2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  LoaderCircle,
  Mic,
  Paperclip,
  Plus,
  Send,
  Smile,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';
import { toast } from 'sonner';
import AudioPlayer from './AudioPlayer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface MessageInputProps {
  selectedChat: { id: string; type: 'channel' | 'dm'; name?: string } | null;
  dmConversationId?: string;
  onMessageSent?: (newMessage: any) => void;
  onMessageConfirmed?: (temporaryId: string, confirmedMessage: any) => void;
  onMessageFailed?: (temporaryId: string) => void;
  onMessageUploadProgress?: (temporaryId: string, progress: number) => void;
  onSyncRequested?: () => void;
  replyTarget?: {
    id: string;
    text: string;
    sender: { id: string; name: string };
  } | null;
  onCancelReply?: () => void;
  sendTyping?: (isTyping: boolean) => void;
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  isImage: boolean;
}

const formatDurationLabel = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  return [minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':');
};

const getPreferredRecordingMimeType = () => {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
};

const getFileExtensionForMimeType = (mimeType: string) => {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'webm';
};

const revokeObjectUrl = (value?: string | null) => {
  if (value && value.startsWith('blob:')) {
    URL.revokeObjectURL(value);
  }
};

const scheduleObjectUrlCleanup = (value?: string | null) => {
  if (value && value.startsWith('blob:')) {
    window.setTimeout(() => revokeObjectUrl(value), 60000);
  }
};

const readAudioDuration = async (file: File) =>
  new Promise<number>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement('audio');

    const settle = (value: number) => {
      revokeObjectUrl(objectUrl);
      resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
    };

    audio.preload = 'metadata';
    audio.src = objectUrl;
    audio.onloadedmetadata = () => settle(audio.duration || 0);
    audio.onerror = () => settle(0);
  });

const MessageInput = ({
  selectedChat,
  dmConversationId,
  onMessageSent,
  onMessageConfirmed,
  onMessageFailed,
  onMessageUploadProgress,
  onSyncRequested,
  replyTarget,
  onCancelReply,
  sendTyping,
}: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [pendingAudioPreviewUrl, setPendingAudioPreviewUrl] = useState<string | null>(null);
  const [pendingAudioDuration, setPendingAudioDuration] = useState(0);
  const [isPollComposerOpen, setIsPollComposerOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingDurationRef = useRef(0);
  const discardRecordingRef = useRef(false);
  const previousChatKeyRef = useRef('');
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
  const pendingAudioPreviewUrlRef = useRef<string | null>(null);

  const releasePendingAttachments = (attachments: PendingAttachment[]) => {
    attachments.forEach((attachment) => revokeObjectUrl(attachment.previewUrl));
  };

  const clearPendingAudio = (shouldRevoke = true) => {
    if (shouldRevoke) {
      revokeObjectUrl(pendingAudioPreviewUrl);
    }
    setPendingAudioFile(null);
    setPendingAudioPreviewUrl(null);
    setPendingAudioDuration(0);
  };

  const clearRecordingInterval = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const stopRecordingTracks = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const stopVoiceRecording = (discard = false) => {
    discardRecordingRef.current = discard;

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      clearRecordingInterval();
      stopRecordingTracks();
      setIsRecordingVoice(false);
      setRecordingElapsedSeconds(0);
      recordingDurationRef.current = 0;
      return;
    }

    clearRecordingInterval();
    setIsRecordingVoice(false);
    recorder.stop();
  };

  const startVoiceRecording = async () => {
    if (isRecordingVoice || isSending) {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setShowPlusMenu(false);
      toast.info('Voice recording is not supported here. Falling back to audio upload.');
      audioInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recordingDurationRef.current = 0;
      discardRecordingRef.current = false;
      setRecordingElapsedSeconds(0);
      setIsRecordingVoice(true);
      setShowPlusMenu(false);
      setShowEmojiPicker(false);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        clearRecordingInterval();
        stopRecordingTracks();
        setIsRecordingVoice(false);
        toast.error('Unable to continue voice recording');
      };

      recorder.onstop = async () => {
        const shouldDiscard = discardRecordingRef.current;
        const chunks = [...recordingChunksRef.current];
        const durationSeconds = recordingDurationRef.current;
        clearRecordingInterval();
        stopRecordingTracks();
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        recordingDurationRef.current = 0;
        setRecordingElapsedSeconds(0);

        if (shouldDiscard || !chunks.length) {
          discardRecordingRef.current = false;
          return;
        }

        const blobMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const file = new File([new Blob(chunks, { type: blobMimeType })], `voice-note-${Date.now()}.${getFileExtensionForMimeType(blobMimeType)}`, {
          type: blobMimeType,
        });
        const previewUrl = URL.createObjectURL(file);
        const derivedDuration = durationSeconds || (await readAudioDuration(file));

        revokeObjectUrl(pendingAudioPreviewUrl);
        setPendingAudioFile(file);
        setPendingAudioPreviewUrl(previewUrl);
        setPendingAudioDuration(derivedDuration);
        discardRecordingRef.current = false;
      };

      recorder.start(250);
      recordingIntervalRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingElapsedSeconds(recordingDurationRef.current);
      }, 1000);
    } catch (err: any) {
      stopRecordingTracks();
      clearRecordingInterval();
      setIsRecordingVoice(false);
      toast.error(err?.message || 'Microphone permission is required for voice notes');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    pendingAudioPreviewUrlRef.current = pendingAudioPreviewUrl;
  }, [pendingAudioPreviewUrl]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      clearRecordingInterval();
      stopRecordingTracks();
      releasePendingAttachments(pendingAttachmentsRef.current);
      revokeObjectUrl(pendingAudioPreviewUrlRef.current);
      sendTyping?.(false);
    };
  }, [sendTyping]);

  useEffect(() => {
    const currentChatKey = selectedChat ? `${selectedChat.type}:${selectedChat.id}` : '';
    if (previousChatKeyRef.current && previousChatKeyRef.current !== currentChatKey) {
      stopVoiceRecording(true);
      sendTyping?.(false);
      setMessage('');
      setShowEmojiPicker(false);
      setShowPlusMenu(false);
      setIsPollComposerOpen(false);
      setPollOptions(['', '']);
      setPendingAttachments((current) => {
        releasePendingAttachments(current);
        return [];
      });
      clearPendingAudio(true);
    }
    previousChatKeyRef.current = currentChatKey;
  }, [selectedChat?.id, selectedChat?.type, sendTyping]);

  const insertAtSelection = (nextValue: string, selectionStart: number, selectionEnd: number) => {
    setMessage(nextValue);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = message.slice(start, end);
    const hasSelection = start !== end;
    const nextValue = `${message.slice(0, start)}${prefix}${selectedText}${suffix}${message.slice(end)}`;
    const cursorStart = start + prefix.length;
    const cursorEnd = hasSelection ? cursorStart + selectedText.length : cursorStart;
    insertAtSelection(nextValue, cursorStart, cursorEnd);
  };

  const formatLinkSelection = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = message.slice(start, end);
    const nextValue = `${message.slice(0, start)}[${selectedText}](https://)${message.slice(end)}`;
    const labelStart = start + 1;
    const labelEnd = labelStart + selectedText.length;
    const urlStart = labelEnd + 3;
    const urlEnd = urlStart + 'https://'.length;
    insertAtSelection(nextValue, selectedText ? urlStart : labelStart, selectedText ? urlEnd : labelStart);
  };

  const formatListSelection = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = message.slice(start, end);

    if (!selectedText) {
      const nextValue = `${message.slice(0, start)}- ${message.slice(end)}`;
      insertAtSelection(nextValue, start + 2, start + 2);
      return;
    }

    const formatted = selectedText
      .split('\n')
      .map((line) => (line.trim().startsWith('- ') ? line : `- ${line}`))
      .join('\n');
    const nextValue = `${message.slice(0, start)}${formatted}${message.slice(end)}`;
    insertAtSelection(nextValue, start, start + formatted.length);
  };

  const formatCodeSelection = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = message.slice(start, end);
    const isBlock = selectedText.includes('\n');
    const prefix = isBlock ? '```\n' : '`';
    const suffix = isBlock ? '\n```' : '`';
    const nextValue = `${message.slice(0, start)}${prefix}${selectedText}${suffix}${message.slice(end)}`;
    const cursorStart = start + prefix.length;
    const cursorEnd = selectedText ? cursorStart + selectedText.length : cursorStart;
    insertAtSelection(nextValue, cursorStart, cursorEnd);
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setMessage((current) => `${current}${emoji}`);
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const nextValue = `${message.slice(0, start)}${emoji}${message.slice(end)}`;
    const cursor = start + emoji.length;
    insertAtSelection(nextValue, cursor, cursor);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);

    if (!selectedChat || !sendTyping) {
      return;
    }

    sendTyping(true);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      sendTyping(false);
    }, 1500);
  };

  const addPendingFiles = async (files: FileList | null, imageOnly = false) => {
    const nextFiles = Array.from(files || []).filter((file) => !imageOnly || file.type.startsWith('image/'));
    if (!nextFiles.length) {
      return;
    }

    const mappedFiles = nextFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/'),
    }));

    setPendingAttachments((current) => [...current, ...mappedFiles]);
  };

  const handleAttachFile = () => {
    setShowPlusMenu(false);
    fileInputRef.current?.click();
  };

  const handleShareImage = () => {
    setShowPlusMenu(false);
    imageInputRef.current?.click();
  };

  const handleCreatePoll = () => {
    setShowPlusMenu(false);
    setIsPollComposerOpen(true);
    setPollOptions((current) => (current.length >= 2 ? current : ['', '']));
  };

  const handleVoiceNote = () => {
    if (isRecordingVoice) {
      stopVoiceRecording(false);
      return;
    }

    void startVoiceRecording();
  };

  const handleAudioFallbackSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    const nextDuration = await readAudioDuration(file);

    revokeObjectUrl(pendingAudioPreviewUrl);
    setPendingAudioFile(file);
    setPendingAudioPreviewUrl(nextPreviewUrl);
    setPendingAudioDuration(nextDuration);
  };

  const sendDmMessage = async (
    token: string,
    payload: FormData | Record<string, unknown>,
    temporaryId: string,
    requestConfig?: Record<string, unknown>
  ) => {
    const candidateIds = Array.from(
      new Set([selectedChat?.id, dmConversationId].filter((value): value is string => Boolean(value)))
    );

    let lastError: any;

    for (const candidateId of candidateIds) {
      try {
        return await axios.post(`${API_BASE_URL}/dms/${candidateId}/messages`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}),
          },
          ...requestConfig,
        });
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const shouldTryNextCandidate = candidateIds.length > 1 && (status === 400 || status === 404);
        console.warn('[MessageInput] DM send attempt failed', {
          candidateId,
          temporaryId,
          status,
          message: err.message,
        });
        if (shouldTryNextCandidate) {
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('Failed to send DM');
  };

  const normalizedPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean);
  const hasPollDraft = isPollComposerOpen || pollOptions.some((option) => option.trim().length > 0);
  const hasValidPoll = normalizedPollOptions.length >= 2;
  const hasPendingContent =
    message.trim().length > 0 || pendingAttachments.length > 0 || Boolean(pendingAudioFile) || hasValidPoll;
  const canSend = !isSending && !isRecordingVoice && hasPendingContent && (!hasPollDraft || hasValidPoll);
  const recordingLabel = formatDurationLabel(recordingElapsedSeconds);
  const pendingAudioLabel = formatDurationLabel(pendingAudioDuration);

  const handleSend = async () => {
    if (!selectedChat || isSending || isRecordingVoice) {
      return;
    }

    if (hasPollDraft && !hasValidPoll) {
      toast.error('Add at least two poll options before sending the poll');
      return;
    }

    const textToSend = message.trim();
    if (!textToSend && !pendingAttachments.length && !pendingAudioFile && !hasValidPoll) {
      return;
    }

    const temporaryId = `tmp-${Date.now()}`;
    const optimisticAttachments = pendingAttachments.map((attachment) => ({
      name: attachment.file.name,
      url: attachment.previewUrl,
      type: attachment.isImage ? 'image' : 'file',
      mimeType: attachment.file.type || null,
      size: attachment.file.size,
    }));
    const optimisticAudio = pendingAudioFile
      ? {
          name: pendingAudioFile.name,
          url: pendingAudioPreviewUrl || '',
          type: 'audio',
          mimeType: pendingAudioFile.type || null,
          size: pendingAudioFile.size,
          duration: pendingAudioDuration,
        }
      : null;
    const shouldTrackImageUpload = optimisticAttachments.some((attachment) =>
      String(attachment.type).toLowerCase().includes('image')
    );
    const draftSnapshot = {
      message,
      attachments: pendingAttachments,
      audioFile: pendingAudioFile,
      audioPreviewUrl: pendingAudioPreviewUrl,
      audioDuration: pendingAudioDuration,
      pollOptions,
      isPollComposerOpen,
    };

    const optimisticMessage = {
      id: temporaryId,
      sender: { id: 'me', name: 'You', avatar: null },
      text: textToSend,
      time: new Date().toISOString(),
      isOwn: true,
      status: 'sent' as const,
      attachments: optimisticAttachments,
      audio: optimisticAudio,
      hasImage: optimisticAttachments.some((attachment) => String(attachment.type).toLowerCase() === 'image'),
      hasAudio: Boolean(optimisticAudio),
      duration: optimisticAudio ? pendingAudioLabel : undefined,
      poll: hasValidPoll ? { options: normalizedPollOptions, votes: {} } : null,
      uploadProgress: shouldTrackImageUpload ? 0 : null,
      ...(replyTarget && {
        replyTo: replyTarget.id,
        replyToText: replyTarget.text,
        replyToSender: replyTarget.sender.name,
      }),
    };

    onMessageSent?.(optimisticMessage);
    setMessage('');
    setPendingAttachments([]);
    setPendingAudioFile(null);
    setPendingAudioPreviewUrl(null);
    setPendingAudioDuration(0);
    setIsPollComposerOpen(false);
    setPollOptions(['', '']);
    setShowEmojiPicker(false);
    setShowPlusMenu(false);
    setIsSending(true);
    onCancelReply?.();
    sendTyping?.(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token');
      }

      const requestConfig: Record<string, unknown> = {};
      let payload: FormData | Record<string, unknown> = {
        text: textToSend,
        ...(replyTarget ? { replyTo: replyTarget.id } : {}),
      };

      if (pendingAttachments.length > 0 || pendingAudioFile || hasValidPoll) {
        const formData = new FormData();

        if (textToSend) {
          formData.append('text', textToSend);
        }
        if (replyTarget?.id) {
          formData.append('replyTo', replyTarget.id);
        }
        pendingAttachments.forEach((attachment) => {
          formData.append('attachments', attachment.file);
        });
        if (pendingAudioFile) {
          formData.append('audio', pendingAudioFile);
          if (pendingAudioDuration > 0) {
            formData.append('audioDuration', String(pendingAudioDuration));
          }
        }
        if (hasValidPoll) {
          formData.append('poll', JSON.stringify({ options: normalizedPollOptions }));
        }
        payload = formData;

        if (shouldTrackImageUpload) {
          requestConfig.onUploadProgress = (progressEvent: any) => {
            const total = progressEvent?.total;
            const loaded = progressEvent?.loaded;
            if (!total || !loaded) {
              return;
            }
            const nextProgress = Math.max(1, Math.min(99, Math.round((loaded / total) * 100)));
            onMessageUploadProgress?.(temporaryId, nextProgress);
          };
        }
      }

      const response =
        selectedChat.type === 'channel'
          ? await axios.post(`${API_BASE_URL}/channels/${selectedChat.id}/messages`, payload, {
              headers: {
                Authorization: `Bearer ${token}`,
                ...(payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}),
              },
              ...requestConfig,
            })
          : await sendDmMessage(token, payload, temporaryId, requestConfig);

      if (shouldTrackImageUpload) {
        onMessageUploadProgress?.(temporaryId, 100);
      }

      const confirmedMessage = response.data?.message || response.data?.data || response.data;
      if (confirmedMessage && typeof confirmedMessage === 'object') {
        onMessageConfirmed?.(temporaryId, confirmedMessage);
      } else {
        onSyncRequested?.();
      }

      draftSnapshot.attachments.forEach((attachment) => scheduleObjectUrlCleanup(attachment.previewUrl));
      scheduleObjectUrlCleanup(draftSnapshot.audioPreviewUrl);
    } catch (err: any) {
      console.error('[MessageInput] Send error:', err);
      onMessageFailed?.(temporaryId);
      setMessage(draftSnapshot.message);
      setPendingAttachments(draftSnapshot.attachments);
      setPendingAudioFile(draftSnapshot.audioFile);
      setPendingAudioPreviewUrl(draftSnapshot.audioPreviewUrl);
      setPendingAudioDuration(draftSnapshot.audioDuration);
      setPollOptions(draftSnapshot.pollOptions);
      setIsPollComposerOpen(draftSnapshot.isPollComposerOpen);
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (!selectedChat) {
    return null;
  }

  return (
    <div className="relative border-t border-border/70 bg-white/38 px-3 pb-3 pt-2 md:px-5">
      {replyTarget && (
        <div className="mx-auto mb-3 w-full max-w-[820px] rounded-[24px] border border-border bg-white/80 px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-sm">
              <div className="font-semibold text-text-primary">{replyTarget.sender.name}</div>
              <div className="truncate text-text-secondary">{replyTarget.text}</div>
            </div>
            <button onClick={onCancelReply} className="rounded-full p-1 text-text-secondary transition hover:bg-panel-muted hover:text-text-primary cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isRecordingVoice && (
        <div className="mx-auto mb-3 flex w-full max-w-[820px] items-center justify-between gap-3 rounded-[24px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <div>
              <div className="font-semibold">Recording voice note</div>
              <div className="text-xs uppercase tracking-[0.2em] text-rose-700">{recordingLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => stopVoiceRecording(true)}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              onClick={() => stopVoiceRecording(false)}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700 cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </button>
          </div>
        </div>
      )}

      {(pendingAttachments.length > 0 || pendingAudioFile || hasPollDraft) && (
        <div className="mx-auto mb-2.5 w-full max-w-[820px] space-y-2">
          {pendingAttachments.length > 0 && (
            <div className="rounded-[22px] border border-border bg-white/86 px-3 py-3 shadow-sm">
              {pendingAttachments.some((attachment) => attachment.isImage) && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {pendingAttachments
                    .filter((attachment) => attachment.isImage)
                    .map((attachment) => (
                      <div key={attachment.id} className="group relative overflow-hidden rounded-[22px] border border-border/80 bg-panel-muted">
                        <img src={attachment.previewUrl} alt={attachment.file.name} className="h-20 w-full object-cover" />
                        <button
                          onClick={() =>
                            setPendingAttachments((current) => {
                              const removed = current.find((item) => item.id === attachment.id);
                              if (removed) {
                                revokeObjectUrl(removed.previewUrl);
                              }
                              return current.filter((item) => item.id !== attachment.id);
                            })
                          }
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/60 text-white transition hover:bg-slate-950/80 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="truncate px-3 py-2 text-xs font-medium text-text-primary">{attachment.file.name}</div>
                      </div>
                    ))}
                </div>
              )}

              {pendingAttachments.some((attachment) => !attachment.isImage) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingAttachments
                    .filter((attachment) => !attachment.isImage)
                    .map((attachment) => (
                      <div key={attachment.id} className="inline-flex items-center gap-2 rounded-full bg-panel-muted px-3 py-2 text-xs text-text-primary">
                        <Paperclip className="h-3.5 w-3.5 text-text-secondary" />
                        <span className="max-w-[180px] truncate">{attachment.file.name}</span>
                        <button
                          onClick={() =>
                            setPendingAttachments((current) => {
                              const removed = current.find((item) => item.id === attachment.id);
                              if (removed) {
                                revokeObjectUrl(removed.previewUrl);
                              }
                              return current.filter((item) => item.id !== attachment.id);
                            })
                          }
                          className="text-text-secondary transition hover:text-text-primary cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {pendingAudioFile && (
            <div className="rounded-[22px] border border-border bg-white/88 px-3 py-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">Voice note ready</div>
                  <div className="mt-1 text-xs text-text-secondary">{pendingAudioLabel}</div>
                </div>
                <button
                  onClick={() => clearPendingAudio(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-panel-muted text-text-secondary transition hover:text-text-primary cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {pendingAudioPreviewUrl && <AudioPlayer src={pendingAudioPreviewUrl} duration={pendingAudioDuration} tone="light" compact />}
            </div>
          )}

          {hasPollDraft && (
            <div className="rounded-[22px] border border-border bg-white/86 px-3 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Poll</div>
                  <div className="mt-1 text-sm text-text-primary">Add at least two options.</div>
                </div>
                <button
                  onClick={() => {
                    setIsPollComposerOpen(false);
                    setPollOptions(['', '']);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-panel-muted text-text-secondary transition hover:text-text-primary cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {pollOptions.map((option, index) => (
                  <div key={`poll-option-${index}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(event) =>
                        setPollOptions((current) => current.map((entry, entryIndex) => (entryIndex === index ? event.target.value : entry)))
                      }
                      placeholder={`Option ${index + 1}`}
                      className="w-full rounded-2xl border border-border bg-panel-muted px-4 py-3 text-sm text-text-primary outline-none transition focus:border-blue/30 focus:bg-white"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => setPollOptions((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-panel-muted text-text-secondary transition hover:text-text-primary cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => setPollOptions((current) => [...current, ''])}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add option
                </button>
                <span className={`text-xs font-medium ${hasValidPoll ? 'text-success' : 'text-text-secondary'}`}>
                  {hasValidPoll ? `${normalizedPollOptions.length} options ready` : 'Minimum 2 options'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mx-auto w-full max-w-[820px] rounded-[26px] border border-white/80 bg-white/88 shadow-[0_16px_34px_rgba(148,163,184,0.14)] backdrop-blur">
        <div className="flex items-center gap-1 border-b border-border/70 px-3 py-1.5">
          <button onClick={() => wrapSelection('**')} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-panel-muted hover:text-text-primary cursor-pointer">
            <Bold className="h-4 w-4" />
          </button>
          <button onClick={() => wrapSelection('_')} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-panel-muted hover:text-text-primary cursor-pointer">
            <Italic className="h-4 w-4" />
          </button>
          <button onClick={formatLinkSelection} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-panel-muted hover:text-text-primary cursor-pointer">
            <Link2 className="h-4 w-4" />
          </button>
          <button onClick={formatListSelection} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-panel-muted hover:text-text-primary cursor-pointer">
            <List className="h-4 w-4" />
          </button>
          <button onClick={formatCodeSelection} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-panel-muted hover:text-text-primary cursor-pointer">
            <Code2 className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-3">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            placeholder={selectedChat.type === 'channel' ? `Message #${selectedChat.name || 'channel'}` : `Message ${selectedChat.name || 'conversation'}`}
            className="min-h-[72px] max-h-32 w-full resize-none rounded-[20px] bg-panel-muted px-4 py-3 text-[15px] leading-6 text-text-primary outline-none placeholder:text-text-secondary"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1.5">
          <div className="flex items-center gap-1.5">
            <div ref={plusMenuRef} className="relative">
              <button
                onClick={() => setShowPlusMenu((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-panel-muted text-text-secondary transition hover:bg-panel-strong hover:text-text-primary cursor-pointer"
              >
                <Plus className="h-5 w-5" />
              </button>

              {showPlusMenu && (
                <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-64 rounded-[24px] border border-white/80 bg-white p-2 shadow-[0_22px_45px_rgba(15,23,42,0.16)]">
                  <button
                    onClick={handleAttachFile}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
                  >
                    <Paperclip className="h-4.5 w-4.5 text-text-secondary" />
                    Attach file
                  </button>
                  <button
                    onClick={handleVoiceNote}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
                  >
                    <Mic className={`h-4.5 w-4.5 ${isRecordingVoice ? 'text-rose-600' : 'text-text-secondary'}`} />
                    {isRecordingVoice ? 'Stop recording' : 'Voice note'}
                  </button>
                  <button
                    onClick={handleShareImage}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
                  >
                    <ImageIcon className="h-4.5 w-4.5 text-text-secondary" />
                    Share image
                  </button>
                  <button
                    onClick={handleCreatePoll}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
                  >
                    <BarChart3 className="h-4.5 w-4.5 text-text-secondary" />
                    Create poll
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowEmojiPicker((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition hover:bg-panel-muted hover:text-text-primary cursor-pointer"
            >
              <Smile className="h-5 w-5" />
            </button>

            <button
              onClick={handleVoiceNote}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition cursor-pointer ${
                isRecordingVoice
                  ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                  : 'text-text-secondary hover:bg-panel-muted hover:text-text-primary'
              }`}
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => void handleSend()}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
              canSend
                ? 'bg-blue text-white shadow-[0_12px_26px_rgba(37,99,235,0.28)] hover:bg-blue-dark cursor-pointer'
                : 'bg-panel-muted text-text-secondary cursor-not-allowed'
            }`}
            disabled={!canSend}
          >
            {isSending ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
            Send
          </button>
        </div>
      </div>

      {showEmojiPicker && (
        <div ref={pickerRef} className="absolute bottom-[calc(100%+8px)] left-6 z-50 shadow-2xl">
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              insertEmoji(emojiData.emoji);
              setShowEmojiPicker(false);
            }}
            width={320}
            height={390}
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis={true}
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void addPendingFiles(event.target.files, false);
          event.target.value = '';
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void addPendingFiles(event.target.files, true);
          event.target.value = '';
        }}
      />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void handleAudioFallbackSelection(event)} />
    </div>
  );
};

export default MessageInput;





