'use client';
import { useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from '../context/webSocketContext';

const readPathValue = (source: any, path: string) =>
  path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), source);

const extractRoomId = (payload: any, keys: string[]): string | undefined => {
  const sources = [payload, payload?.message, payload?.data, payload?.payload];

  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const key of keys) {
      const value = readPathValue(source, key);
      if (value != null && value !== '') {
        return String(value);
      }
    }
  }

  return undefined;
};

const matchesRoom = (payload: any, roomId: string, keys: string[]) => {
  const incomingRoomId = extractRoomId(payload, keys);
  return !incomingRoomId || incomingRoomId === roomId;
};

export function useChannel(
  channelId: string | undefined,
  onEvent: {
    onMessage?: (msg: any) => void;
    onEdited?: (messageId: string, text: string) => void;
    onDeleted?: (messageId: string) => void;
    onTyping?: (userId: string, isTyping: boolean) => void;
    onStatusUpdate?: (update: any) => void;
    onReaction?: (update: any) => void;
    onPollUpdate?: (update: any) => void;
  }
) {
  const { socket, isConnected } = useWebSocket();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!socket || !channelId || !isConnected) {
      return;
    }

    socket.emit('join_channel', { channelId });

    const onMessage = (payload: any) => {
      if (!matchesRoom(payload, channelId, ['channelId', 'channel.id'])) {
        return;
      }
      const message = payload?.message ?? payload;
      onEventRef.current.onMessage?.(message);
    };

    const onEdited = (payload: any) => {
      if (!matchesRoom(payload, channelId, ['channelId', 'channel.id'])) {
        return;
      }
      onEventRef.current.onEdited?.(String(payload?.messageId ?? payload?.id ?? ''), payload?.text);
    };

    const onDeleted = (payload: any) => {
      if (!matchesRoom(payload, channelId, ['channelId', 'channel.id'])) {
        return;
      }
      const messageId = String(payload?.messageId ?? payload?.id ?? '');
      if (messageId) {
        onEventRef.current.onDeleted?.(messageId);
      }
    };

    const onTyping = (payload: any) => {
      if (!matchesRoom(payload, channelId, ['channelId', 'channel.id'])) {
        return;
      }
      onEventRef.current.onTyping?.(String(payload?.userId ?? payload?.senderId ?? ''), Boolean(payload?.isTyping));
    };

    const onStatusUpdate = (payload: any) => {
      if (!matchesRoom(payload, channelId, ['channelId', 'channel.id'])) {
        return;
      }
      onEventRef.current.onStatusUpdate?.(payload);
    };

    const onReaction = (payload: any) => {
      if (!matchesRoom(payload, channelId, ['channelId', 'channel.id'])) {
        return;
      }
      onEventRef.current.onReaction?.(payload);
    };

    const onPollUpdate = (payload: any) => {
      if (!matchesRoom(payload, channelId, ['channelId', 'channel.id'])) {
        return;
      }
      onEventRef.current.onPollUpdate?.(payload);
    };

    socket.on('new_message', onMessage);
    socket.on('message_edited', onEdited);
    socket.on('message_deleted', onDeleted);
    socket.on('typing', onTyping);
    socket.on('message_status_update', onStatusUpdate);
    socket.on('reaction_update', onReaction);
    socket.on('poll_update', onPollUpdate);

    return () => {
      socket.emit('leave_channel', { channelId });
      socket.off('new_message', onMessage);
      socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted);
      socket.off('typing', onTyping);
      socket.off('message_status_update', onStatusUpdate);
      socket.off('reaction_update', onReaction);
      socket.off('poll_update', onPollUpdate);
    };
  }, [socket, channelId, isConnected]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      socket?.emit('typing', { channelId, isTyping });
    },
    [socket, channelId]
  );

  const markRead = useCallback(
    (messageIds: string[]) => {
      if (!messageIds.length) {
        return;
      }
      socket?.emit('messages_read', { channelId, messageIds });
    },
    [socket, channelId]
  );

  return { sendTyping, markRead };
}


