const DM_ROOMS_KEY = 'dm_room_registry_v1';
const DM_LAST_READ_KEY = 'dm_last_read_v1';
const DM_MESSAGES_KEY = 'dm_messages_registry_v1';

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const upsertDmRoom = (room) => {
  if (!room?.roomId) return;

  const registry = readJson(DM_ROOMS_KEY, {});
  const existing = registry[room.roomId] || {};
  registry[room.roomId] = {
    ...existing,
    ...room,
    roomId: room.roomId,
    updatedAt: new Date().toISOString(),
  };
  writeJson(DM_ROOMS_KEY, registry);
};

export const getDmRoomsForUser = (userId) => {
  if (!userId) return [];
  const registry = readJson(DM_ROOMS_KEY, {});

  return Object.values(registry)
    .filter((room) => Number(room?.user1Id) === Number(userId) || Number(room?.user2Id) === Number(userId))
    .sort((a, b) => {
      const aTime = new Date(a?.lastMessageAt || a?.updatedAt || 0).getTime();
      const bTime = new Date(b?.lastMessageAt || b?.updatedAt || 0).getTime();
      return bTime - aTime;
    });
};

export const getLastReadMessageId = (userId, roomId) => {
  if (!userId || !roomId) return 0;
  const lastRead = readJson(DM_LAST_READ_KEY, {});
  return Number(lastRead?.[userId]?.[roomId] || 0);
};

export const setLastReadMessageId = (userId, roomId, messageId) => {
  if (!userId || !roomId || !messageId) return;
  const lastRead = readJson(DM_LAST_READ_KEY, {});
  const userMap = lastRead[userId] || {};
  userMap[roomId] = Number(messageId);
  lastRead[userId] = userMap;
  writeJson(DM_LAST_READ_KEY, lastRead);
};

export const appendDmMessage = (roomId, message) => {
  if (!roomId || !message) return;
  const registry = readJson(DM_MESSAGES_KEY, {});
  const list = Array.isArray(registry[roomId]) ? registry[roomId] : [];
  const exists = list.some((item) => Number(item?.messageId) === Number(message?.messageId));
  if (!exists) {
    list.push(message);
  }
  list.sort((a, b) => Number(a?.messageId || 0) - Number(b?.messageId || 0));
  registry[roomId] = list.slice(-300);
  writeJson(DM_MESSAGES_KEY, registry);
};

export const setDmMessages = (roomId, messages) => {
  if (!roomId) return;
  const registry = readJson(DM_MESSAGES_KEY, {});
  registry[roomId] = Array.isArray(messages) ? messages.slice(-300) : [];
  writeJson(DM_MESSAGES_KEY, registry);
};

export const getDmMessages = (roomId) => {
  if (!roomId) return [];
  const registry = readJson(DM_MESSAGES_KEY, {});
  return Array.isArray(registry[roomId]) ? registry[roomId] : [];
};
