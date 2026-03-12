/* eslint-disable @typescript-eslint/no-explicit-any */
// components/main/MessageBubble.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Copy, Forward, MoreVertical, Pencil, Reply, SmilePlus, Trash2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { toast } from 'sonner';
import MediaLightboxModal from './MediaLightboxModal';
import AudioPlayer from './AudioPlayer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Attachment {
  name: string;
  url: string;
  type: string;
  mimeType?: string | null;
  size?: number | null;
  duration?: number | string | null;
  thumbnailUrl?: string | null;
}

interface PollData {
  options?: string[];
  votes?: Record<string, string[]>;
}

interface ReactionSummary {
  emoji: string;
  count: number;
  userIds?: string[];
}

interface MessageBubbleProps {
  message: {
    id: string;
    sender: { id: string; name: string; avatar?: string };
    text: string;
    time: string;
    isOwn: boolean;
    hasImage?: boolean;
    hasAudio?: boolean;
    duration?: string;
    attachments?: Attachment[];
    audio?: Attachment | null;
    poll?: PollData | null;
    replyTo?: string;
    replyToText?: string;
    replyToSender?: string;
    reactions?: ReactionSummary[];
    status?: 'sent' | 'delivered' | 'read';
    uploadProgress?: number | null;
  };
  currentUserId?: string | null;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onReply?: (message: any) => void;
  onForward?: (message: any) => void;
  onPollVoted?: (messageId: string, poll: PollData) => void;
  onReactionOptimistic?: (messageId: string, emoji: string) => void;
  onScrollToMessage?: (targetId: string) => void;
  showSenderName?: boolean;
}

const isImageAttachment = (attachment: Attachment) => {
  const type = String(attachment.type || '').toLowerCase();
  const mimeType = String(attachment.mimeType || '').toLowerCase();
  return type === 'image' || mimeType.startsWith('image/');
};

const isAudioAttachment = (attachment: Attachment) => {
  const type = String(attachment.type || '').toLowerCase();
  const mimeType = String(attachment.mimeType || '').toLowerCase();
  return type === 'audio' || mimeType.startsWith('audio/');
};

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const MessageBubble = ({
  message,
  currentUserId,
  onDelete,
  onEdit,
  onReply,
  onForward,
  onPollVoted,
  onReactionOptimistic,
  onScrollToMessage,
  showSenderName = false,
}: MessageBubbleProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [imageLoadState, setImageLoadState] = useState<Record<string, boolean>>({});
  const [voteSubmittingFor, setVoteSubmittingFor] = useState<string | null>(null);
  const [reactionSubmittingFor, setReactionSubmittingFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditText(message.text);
  }, [message.text]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReact = async (emojiData: any) => {
    const emoji = emojiData?.emoji;
    if (!emoji) {
      return;
    }

    setShowEmojiPicker(false);
    setReactionSubmittingFor(emoji);
    onReactionOptimistic?.(message.id, emoji);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/messages/${message.id}/reactions`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err: any) {
      onReactionOptimistic?.(message.id, emoji);
      toast.error(err.response?.data?.error || 'Failed to add reaction');
    } finally {
      setReactionSubmittingFor(null);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onDelete?.(message.id);
      toast.success('Message deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete message');
    }
  };

  const handleEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed === message.text.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/messages/${message.id}`,
        { text: trimmed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onEdit?.(message.id, trimmed);
      setIsEditing(false);
      toast.success('Message updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to edit message');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.text);
    toast.success('Copied to clipboard');
    setShowMenu(false);
  };

  const handlePollVote = async (option: string) => {
    if (voteSubmittingFor) {
      return;
    }

    try {
      setVoteSubmittingFor(option);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/messages/${message.id}/poll/vote`,
        { option },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nextPoll = response.data?.poll ?? response.data?.data?.poll ?? response.data?.message?.poll;
      if (nextPoll) {
        onPollVoted?.(message.id, nextPoll);
      }
      toast.success('Vote recorded');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to vote on poll');
    } finally {
      setVoteSubmittingFor(null);
    }
  };

  const markImageLoaded = (imageKey: string) => {
    setImageLoadState((prev) => (prev[imageKey] ? prev : { ...prev, [imageKey]: true }));
  };

  const displayTime = (() => {
    const timestamp = new Date(message.time);
    return Number.isNaN(timestamp.getTime()) ? '--:--' : format(timestamp, 'HH:mm');
  })();

  const emojiOnly = (() => {
    const text = message.text.trim();
    if (!text) {
      return false;
    }
    return /^(?:\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*\s?)+$/u.test(text);
  })();

  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const imageAttachments = attachments.filter(isImageAttachment);
  const fileAttachments = attachments.filter((attachment) => !isImageAttachment(attachment) && !isAudioAttachment(attachment));
  const audioAttachment = message.audio || attachments.find(isAudioAttachment) || null;
  const pollOptions = Array.isArray(message.poll?.options) ? message.poll?.options : [];
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  const sortedReactions = useMemo(() => {
    return [...reactions].sort((left, right) => {
      const leftOwn = Boolean(currentUserId && left.userIds?.includes(currentUserId));
      const rightOwn = Boolean(currentUserId && right.userIds?.includes(currentUserId));
      if (leftOwn === rightOwn) {
        return right.count - left.count;
      }
      return leftOwn ? -1 : 1;
    });
  }, [currentUserId, reactions]);
  const hasText = Boolean(message.text.trim());
  const bubbleTone = message.isOwn ? 'bg-gradient-to-br from-blue to-blue-dark text-white' : 'border border-white/80 bg-white text-text-primary';
  const mutedTone = message.isOwn ? 'bg-white/15 text-white' : 'bg-panel-muted text-text-secondary';
  const showUploadProgress = typeof message.uploadProgress === 'number' && message.uploadProgress > 0 && message.uploadProgress < 100;

  const markdownComponents = {
    p: ({ children }: any) => <p className="whitespace-pre-wrap break-words [&:not(:first-child)]:mt-2">{children}</p>,
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    ul: ({ children }: any) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
    li: ({ children }: any) => <li className="break-words">{children}</li>,
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={message.isOwn ? 'font-medium underline decoration-white/60 underline-offset-4' : 'font-medium text-blue underline underline-offset-4'}
      >
        {children}
      </a>
    ),
    code: ({ inline, children }: any) =>
      inline ? (
        <code className={`rounded px-1.5 py-0.5 font-mono text-[0.92em] ${message.isOwn ? 'bg-white/15 text-white' : 'bg-panel text-text-primary'}`}>
          {children}
        </code>
      ) : (
        <code className="block overflow-x-auto rounded-2xl bg-slate-950/90 px-3 py-2 font-mono text-[0.92em] text-slate-100">
          {children}
        </code>
      ),
    pre: ({ children }: any) => <pre className="mt-2">{children}</pre>,
  };

  return (
    <>
      <div className={`group relative flex items-end gap-3 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
        {!message.isOwn &&
          (message.sender?.avatar ? (
            <img src={message.sender.avatar} alt={message.sender.name} className="h-10 w-10 shrink-0 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-panel-strong text-sm font-semibold text-text-primary">
              {message.sender?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          ))}

        <div className={`relative max-w-[78%] ${message.isOwn ? 'items-end' : 'items-start'}`}>
          {!message.isOwn && showSenderName && <div className="mb-1 pl-1 text-xs font-semibold text-text-primary">{message.sender?.name}</div>}

          {isEditing ? (
            <div className="rounded-[24px] border border-blue/30 bg-white p-3 shadow-[0_18px_36px_rgba(37,99,235,0.12)]">
              <textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                className="min-h-24 w-full resize-none rounded-2xl border border-border bg-panel-muted px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
                autoFocus
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition hover:bg-panel-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  className="rounded-full bg-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-dark cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`relative overflow-hidden ${
                emojiOnly && !imageAttachments.length && !audioAttachment && !fileAttachments.length && !pollOptions.length
                  ? 'bg-transparent px-0 py-0'
                  : `rounded-[24px] px-4 py-3 text-sm leading-7 shadow-[0_18px_34px_rgba(148,163,184,0.16)] ${bubbleTone}`
              }`}
            >
              {message.replyTo && (
                <button
                  onClick={() => onScrollToMessage?.(message.replyTo!)}
                  className={`mb-3 block w-full rounded-2xl px-3 py-2 text-left text-xs transition cursor-pointer ${mutedTone}`}
                >
                  <span className="font-semibold">{message.replyToSender || 'Reply'}</span>
                  <span className="opacity-80"> - {message.replyToText || 'message'}</span>
                </button>
              )}

              {emojiOnly && hasText ? (
                <span className="text-5xl leading-none">{message.text}</span>
              ) : hasText ? (
                <ReactMarkdown components={markdownComponents}>{message.text}</ReactMarkdown>
              ) : null}

              {imageAttachments.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {imageAttachments.map((attachment, index) => {
                    const imageKey = attachment.thumbnailUrl || attachment.url || `${attachment.name}-${index}`;
                    const isLoaded = Boolean(imageLoadState[imageKey]);

                    return (
                      <button
                        key={`${attachment.url}-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className="relative overflow-hidden rounded-[22px] border border-white/10 bg-black/5 text-left cursor-zoom-in"
                      >
                        {!isLoaded && <div className="absolute inset-0 animate-pulse bg-slate-200/80" />}
                        <img
                          src={attachment.thumbnailUrl || attachment.url}
                          alt={attachment.name || `Attachment ${index + 1}`}
                          onLoad={() => markImageLoaded(imageKey)}
                          className={`h-48 w-full object-cover transition duration-300 hover:scale-[1.02] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                        />
                        {showUploadProgress && (
                          <div className="absolute inset-x-0 bottom-0 p-3">
                            <div className="rounded-2xl bg-slate-950/72 px-3 py-2 text-[11px] text-white backdrop-blur">
                              <div className="mb-1.5 flex items-center justify-between gap-3">
                                <span>Uploading image</span>
                                <span>{message.uploadProgress}%</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                                <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${message.uploadProgress}%` }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {audioAttachment?.url && (
                <div className="mt-3">
                  <AudioPlayer
                    src={audioAttachment.url}
                    duration={audioAttachment.duration ?? message.duration}
                    label="Voice note"
                    tone={message.isOwn ? 'dark' : 'light'}
                  />
                </div>
              )}

              {fileAttachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {fileAttachments.map((attachment, index) => (
                    <a
                      key={`${attachment.url}-${index}`}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-xs transition hover:opacity-90 ${mutedTone}`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{attachment.name || 'Attachment'}</div>
                        <div className="truncate opacity-80">
                          {[attachment.mimeType, formatFileSize(attachment.size)].filter(Boolean).join(' • ') || 'Open file'}
                        </div>
                      </div>
                      <span className="shrink-0 font-semibold">Open</span>
                    </a>
                  ))}
                </div>
              )}

              {pollOptions.length > 0 && (
                <div className={`mt-3 rounded-[22px] px-3 py-3 ${mutedTone}`}>
                  <div className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Poll</div>
                  <div className="space-y-2.5">
                    {pollOptions.map((option) => {
                      const optionVotes = Array.isArray(message.poll?.votes?.[option]) ? message.poll?.votes?.[option] : [];
                      const hasCurrentUserVote = Boolean(currentUserId && optionVotes.includes(currentUserId));
                      const isSubmitting = voteSubmittingFor === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handlePollVote(option)}
                          disabled={isSubmitting}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                            hasCurrentUserVote
                              ? message.isOwn
                                ? 'bg-white/20 ring-1 ring-white/30'
                                : 'bg-blue-soft text-blue ring-1 ring-blue/20'
                              : 'bg-black/5 hover:bg-black/10'
                          } ${isSubmitting ? 'cursor-wait opacity-75' : 'cursor-pointer'}`}
                        >
                          <span className="min-w-0 flex-1 break-words pr-2 leading-5">{option}</span>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              message.isOwn ? 'bg-white/12 text-white/90' : 'bg-white/90 text-text-secondary'
                            }`}
                          >
                            {isSubmitting ? 'Voting...' : `${optionVotes.length} vote${optionVotes.length === 1 ? '' : 's'}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {sortedReactions.length > 0 && (
            <div className={`mt-2 flex flex-wrap gap-2 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
              {sortedReactions.map((reaction) => {
                const reactedByCurrentUser = Boolean(currentUserId && reaction.userIds?.includes(currentUserId));
                const isPendingReaction = reactionSubmittingFor === reaction.emoji;

                return (
                  <button
                    key={reaction.emoji}
                    type="button"
                    onClick={() => handleReact({ emoji: reaction.emoji })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                      reactedByCurrentUser
                        ? message.isOwn
                          ? 'bg-white text-blue shadow-sm'
                          : 'border border-blue/20 bg-blue-soft text-blue'
                        : message.isOwn
                          ? 'bg-white/14 text-white'
                          : 'border border-border bg-white text-text-primary'
                    } ${isPendingReaction ? 'opacity-80' : 'hover:-translate-y-0.5'}`}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className={`mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
            <span>{displayTime}</span>
            {message.isOwn && (
              <>
                {message.status === 'read' ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="h-3.5 w-3.5 text-text-secondary" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-text-secondary" />
                )}
              </>
            )}
          </div>

          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className={`absolute -top-2 ${message.isOwn ? '-left-3' : '-right-3'} flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white text-text-secondary opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-text-primary cursor-pointer`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div
              ref={menuRef}
              className={`absolute top-8 z-50 w-40 rounded-2xl border border-border bg-white p-1.5 shadow-[0_22px_50px_rgba(15,23,42,0.14)] ${
                message.isOwn ? 'right-0' : 'left-12'
              }`}
            >
              <button
                onClick={() => {
                  setShowEmojiPicker(true);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
              >
                <SmilePlus className="h-4 w-4" />
                React
              </button>
              <button
                onClick={() => {
                  onReply?.(message);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
              >
                <Reply className="h-4 w-4" />
                Reply
              </button>
              <button
                onClick={() => {
                  onForward?.(message);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
              >
                <Forward className="h-4 w-4" />
                Forward
              </button>
              <button
                onClick={handleCopy}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              {message.isOwn && (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirm(true);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-light-red transition hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}

          {showEmojiPicker && (
            <div ref={emojiRef} className="absolute bottom-full z-50 mb-3">
              <EmojiPicker
                onEmojiClick={handleReact}
                width={280}
                height={350}
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis={true}
              />
            </div>
          )}

          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowConfirm(false)}>
              <div
                className="w-full max-w-sm rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_30px_60px_rgba(15,23,42,0.18)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="text-lg font-semibold text-text-primary">Delete message?</div>
                <p className="mt-2 text-sm leading-6 text-text-secondary">This removes the message for everyone in the conversation.</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition hover:bg-panel-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirm(false);
                      handleDelete();
                    }}
                    className="rounded-full bg-light-red px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <MediaLightboxModal
        isOpen={activeImageIndex !== null}
        items={imageAttachments.map((attachment, index) => ({
          url: attachment.url,
          name: attachment.name || `Image ${index + 1}`,
          mimeType: attachment.mimeType,
          size: attachment.size,
        }))}
        initialIndex={activeImageIndex ?? 0}
        onClose={() => setActiveImageIndex(null)}
      />
    </>
  );
};

export default MessageBubble;

