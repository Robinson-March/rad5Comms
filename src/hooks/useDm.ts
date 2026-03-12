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

export function useDm(
  dmId: string | undefined,
  onEvent: {
    onMessage?: (msg: any) => void;
    onEdited?: (messageId: string, text: string) => void;
    onDeleted?: (messageId: string) => void;
    onTyping?: (userId: string, isTyping: boolean) => void;
    onStatusUpdate?: (update: any) => void;
    onReaction?: (update: any) => void;
  }
) {
  const { socket, isConnected } = useWebSocket();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!socket || !dmId || !isConnected) {
      return;
    }

    socket.emit('join_dm', { dmId });

    const onMessage = (payload: any) => {
      if (!matchesRoom(payload, dmId, ['dmId', 'dm.id'])) {
        return;
      }
      const message = payload?.message ?? payload;
      onEventRef.current.onMessage?.(message);
    };

    const onEdited = (payload: any) => {
      if (!matchesRoom(payload, dmId, ['dmId', 'dm.id'])) {
        return;
      }
      onEventRef.current.onEdited?.(String(payload?.messageId ?? payload?.id ?? ''), payload?.text);
    };

    const onDeleted = (payload: any) => {
      if (!matchesRoom(payload, dmId, ['dmId', 'dm.id'])) {
        return;
      }
      const messageId = String(payload?.messageId ?? payload?.id ?? '');
      if (messageId) {
        onEventRef.current.onDeleted?.(messageId);
      }
    };

    const onTyping = (payload: any) => {
      if (!matchesRoom(payload, dmId, ['dmId', 'dm.id'])) {
        return;
      }
      onEventRef.current.onTyping?.(String(payload?.userId ?? payload?.senderId ?? ''), Boolean(payload?.isTyping));
    };

    const onStatusUpdate = (payload: any) => {
      if (!matchesRoom(payload, dmId, ['dmId', 'dm.id'])) {
        return;
      }
      onEventRef.current.onStatusUpdate?.(payload);
    };

    const onReaction = (payload: any) => {
      if (!matchesRoom(payload, dmId, ['dmId', 'dm.id'])) {
        return;
      }
      onEventRef.current.onReaction?.(payload);
    };

    socket.on('new_dm_message', onMessage);
    socket.on('dm_message_edited', onEdited);
    socket.on('dm_message_deleted', onDeleted);
    socket.on('dm_typing', onTyping);
    socket.on('dm_message_status_update', onStatusUpdate);
    socket.on('dm_reaction_update', onReaction);

    return () => {
      socket.emit('leave_dm', { dmId });
      socket.off('new_dm_message', onMessage);
      socket.off('dm_message_edited', onEdited);
      socket.off('dm_message_deleted', onDeleted);
      socket.off('dm_typing', onTyping);
      socket.off('dm_message_status_update', onStatusUpdate);
      socket.off('dm_reaction_update', onReaction);
    };
  }, [socket, dmId, isConnected]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      socket?.emit('dm_typing', { dmId, isTyping });
    },
    [socket, dmId]
  );

  const markRead = useCallback(
    (messageIds: string[]) => {
      if (!messageIds.length) {
        return;
      }
      socket?.emit('dm_messages_read', { dmId, messageIds });
    },
    [socket, dmId]
  );

  return { sendTyping, markRead };
}


