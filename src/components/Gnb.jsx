import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';

import { useAuth } from '../hooks/useAuth';
import { API_CONFIG } from '../config';
import {
  appendDmMessage,
  getDmMessages,
  getLastReadMessageId,
  hasShownDmReadBoundary,
  setDmMessages,
  setShownDmReadBoundary,
  setLastReadMessageId,
} from '../utils/dmStorage';
import { isAdminUser as checkIsAdminUser } from '../utils/auth';
import './Gnb.css';
import defaultUserImage from '../assets/default_user.png';

function GNB() {
  const location = useLocation();
  const { user, isAuthenticated, isLoading, logout, accessToken } = useAuth();
  const isHomePage = location.pathname === '/';

  const [dmUnreadCount, setDmUnreadCount] = useState(0);
  const [isDmPanelOpen, setIsDmPanelOpen] = useState(false);
  const [dmRooms, setDmRooms] = useState([]);
  const [isDmRoomsLoading, setIsDmRoomsLoading] = useState(false);
  const [dmRoomsError, setDmRoomsError] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messagesByRoomId, setMessagesByRoomId] = useState({});
  const [isMessagesLoadingByRoomId, setIsMessagesLoadingByRoomId] = useState({});
  const [dmInput, setDmInput] = useState('');
  const [isDmSending, setIsDmSending] = useState(false);

  const [dividerUnreadCountByRoomId, setDividerUnreadCountByRoomId] = useState({});
  const [isHomeGnbVisible, setIsHomeGnbVisible] = useState(!isHomePage);

  const [dmPanelOffset, setDmPanelOffset] = useState({ x: 0, y: 0 });
  const [isDraggingDmPanel, setIsDraggingDmPanel] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const messageScrollRef = useRef(null);

  const myUserId = Number(user?.id || 0);
  const isAdminUser = checkIsAdminUser(user);
  const authHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken]
  );

  const normalizeRooms = useCallback((payload) => {
    const list = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.content) ? payload.content : []);

    return list
      .map((room) => ({
        roomId: Number(room?.roomId ?? room?.id ?? 0),
        opponentId: Number(room?.peerUserId ?? room?.opponentId ?? 0),
        opponentName: room?.peerUserName ?? room?.opponentName ?? '상대방',
        opponentProfileImage: room?.peerProfileImage ?? room?.opponentProfileImage ?? null,
        lastMessageId: Number(room?.lastMessageId ?? 0),
        lastMessageAt: room?.lastMessageAt ?? null,
        lastMessagePreview: room?.lastMessagePreview ?? room?.lastMessage ?? '',
        unreadCount: Number(room?.unreadCount ?? 0),
      }))
      .filter((room) => room.roomId > 0);
  }, []);

  const normalizeMessages = useCallback((payload) => {
    const list = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.content) ? payload.content : []);

    return list
      .map((message) => ({
        messageId: Number(message?.messageId ?? message?.id ?? 0),
        roomId: Number(message?.roomId ?? 0),
        senderId: Number(message?.senderId ?? 0),
        senderName: message?.senderName ?? '',
        senderProfileImage: message?.senderProfileImage ?? null,
        content: message?.content ?? '',
        createdAt: message?.createdAt ?? null,
      }))
      .filter((message) => message.messageId > 0)
      .sort((a, b) => a.messageId - b.messageId);
  }, []);

  const fetchRoomMessages = useCallback(async (roomId, { markAsRead = false, size = 50 } = {}) => {
    if (!roomId || !myUserId) return [];

    setIsMessagesLoadingByRoomId((prev) => ({ ...prev, [roomId]: true }));
    try {
      const response = await axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.dmRooms}/${roomId}/messages`, {
        headers: authHeaders,
        withCredentials: true,
        params: { size },
      });

      const messages = normalizeMessages(response?.data?.data);
      setMessagesByRoomId((prev) => ({ ...prev, [roomId]: messages }));
      setDmMessages(roomId, messages);

      const latestMessageId = messages.length > 0 ? messages[messages.length - 1].messageId : 0;
      const lastRead = getLastReadMessageId(myUserId, roomId);
      const unreadCount = messages.filter((m) => m.senderId !== myUserId && m.messageId > lastRead).length;

      if (markAsRead && latestMessageId > 0) {
        setLastReadMessageId(myUserId, roomId, latestMessageId);
      }

      setDmRooms((prev) => prev.map((room) => (
        room.roomId === roomId ? { ...room, unreadCount: markAsRead ? 0 : unreadCount } : room
      )));

      return messages;
    } catch (error) {
      console.error('DM 메시지 조회 실패:', error);
      const fallbackMessages = normalizeMessages(getDmMessages(roomId));
      setMessagesByRoomId((prev) => ({ ...prev, [roomId]: fallbackMessages }));
      return fallbackMessages;
    } finally {
      setIsMessagesLoadingByRoomId((prev) => ({ ...prev, [roomId]: false }));
    }
  }, [authHeaders, myUserId, normalizeMessages]);

  const refreshUnreadCounts = useCallback(async (roomsArg) => {
    if (!myUserId || !Array.isArray(roomsArg) || roomsArg.length === 0) {
      setDmUnreadCount(0);
      return;
    }

    const counts = {};
    await Promise.all(roomsArg.map(async (room) => {
      try {
        const response = await axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.dmRooms}/${room.roomId}/messages`, {
          headers: authHeaders,
          withCredentials: true,
          params: { size: 30 },
        });
        const messages = normalizeMessages(response?.data?.data);
        const lastRead = getLastReadMessageId(myUserId, room.roomId);
        counts[room.roomId] = messages.filter((m) => m.senderId !== myUserId && m.messageId > lastRead).length;
      } catch {
        counts[room.roomId] = room.unreadCount || 0;
      }
    }));

    const nextRooms = roomsArg.map((room) => ({
      ...room,
      unreadCount: counts[room.roomId] || 0,
    }));
    setDmRooms(nextRooms);
    setDmUnreadCount(nextRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0));
  }, [authHeaders, myUserId, normalizeMessages]);

  const fetchDmUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !myUserId) {
      setDmUnreadCount(0);
      return;
    }

    try {
      const response = await axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.dmUnreadCount}`, {
        headers: authHeaders,
        withCredentials: true,
      });

      const rawCount = Number(response?.data?.data?.unreadCount ?? response?.data?.data ?? 0);
      setDmUnreadCount(Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0);
    } catch (error) {
      console.error('Failed to fetch DM unread count:', error);
    }
  }, [isAuthenticated, myUserId, authHeaders]);

  const fetchDmRooms = useCallback(async () => {
    if (!isAuthenticated || !myUserId) {
      setDmRooms([]);
      setSelectedRoomId(null);
      setDmUnreadCount(0);
      return;
    }

    setIsDmRoomsLoading(true);
    setDmRoomsError('');

    try {
      const response = await axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.dmRooms}`, {
        headers: authHeaders,
        withCredentials: true,
        params: { page: 0, size: 50 },
      });

      const rooms = normalizeRooms(response?.data?.data);
      setDmRooms(rooms);

      const nextSelected = selectedRoomId && rooms.some((room) => room.roomId === selectedRoomId)
        ? selectedRoomId
        : null;
      setSelectedRoomId(nextSelected);

      await refreshUnreadCounts(rooms);

      if (isDmPanelOpen && nextSelected) {
        await fetchRoomMessages(nextSelected, { markAsRead: true, size: 50 });
      }
    } catch (error) {
      console.error('DM 방 목록 조회 실패:', error);
      setDmRoomsError(error?.response?.data?.message || 'DM 목록을 불러오지 못했습니다.');
      setDmRooms([]);
      setSelectedRoomId(null);
      setDmUnreadCount(0);
    } finally {
      setIsDmRoomsLoading(false);
    }
  }, [isAuthenticated, myUserId, authHeaders, normalizeRooms, selectedRoomId, refreshUnreadCounts, fetchRoomMessages, isDmPanelOpen]);

  const selectedRoom = dmRooms.find((room) => room.roomId === selectedRoomId) || null;
  const selectedRoomMessages = useMemo(
    () => (selectedRoomId ? (messagesByRoomId[selectedRoomId] || []) : []),
    [selectedRoomId, messagesByRoomId]
  );
  const selectedRoomUnreadCount = Number(selectedRoom?.unreadCount || 0);
  const selectedDividerUnreadCount = Number(
    (selectedRoomId && dividerUnreadCountByRoomId[selectedRoomId]) || 0
  );

  const firstUnreadMessageId = useMemo(() => {
    if (selectedDividerUnreadCount <= 0 || selectedRoomMessages.length === 0) {
      return null;
    }

    let remainingUnread = selectedDividerUnreadCount;
    for (let index = selectedRoomMessages.length - 1; index >= 0; index -= 1) {
      const message = selectedRoomMessages[index];
      if (Number(message?.senderId) === myUserId) {
        continue;
      }

      remainingUnread -= 1;
      if (remainingUnread <= 0) {
        return message.messageId;
      }
    }

    return null;
  }, [selectedRoomMessages, selectedDividerUnreadCount, myUserId]);

  useEffect(() => {
    setIsHomeGnbVisible(!isHomePage);
  }, [isHomePage]);

  useEffect(() => {
    setSelectedRoomId(null);
    setMessagesByRoomId({});
    setDmRooms([]);
    setDmUnreadCount(0);
    setDividerUnreadCountByRoomId({});
    setDmInput('');
  }, [myUserId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchDmRooms();
      fetchDmUnreadCount();
    }, 0);

    if (!isAuthenticated) {
      return () => window.clearTimeout(timeoutId);
    }

    const intervalId = window.setInterval(() => {
      fetchDmRooms();
      fetchDmUnreadCount();
    }, 30000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, fetchDmRooms, fetchDmUnreadCount]);

  useEffect(() => {
    if (!isDmPanelOpen) return;
    fetchDmRooms();
    fetchDmUnreadCount();
  }, [isDmPanelOpen, fetchDmRooms, fetchDmUnreadCount]);

  useEffect(() => {
    if (!selectedRoomId || !isDmPanelOpen) return;
    fetchRoomMessages(selectedRoomId, { markAsRead: true, size: 50 });
  }, [selectedRoomId, isDmPanelOpen, fetchRoomMessages]);

  useEffect(() => {
    if (!isDmPanelOpen || !selectedRoomId) return;

    const scrollEl = messageScrollRef.current;
    if (!scrollEl) return;

    window.requestAnimationFrame(() => {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    });
  }, [isDmPanelOpen, selectedRoomId, selectedRoomMessages.length]);

  useEffect(() => {
    setDmPanelOffset({ x: 0, y: 0 });

    if (!isDmPanelOpen) {
      Object.keys(dividerUnreadCountByRoomId).forEach((roomId) => {
        setShownDmReadBoundary(myUserId, Number(roomId));
      });
      setDividerUnreadCountByRoomId({});
      setDmInput('');
    }
  }, [isDmPanelOpen, dividerUnreadCountByRoomId, myUserId]);

  useEffect(() => {
    if (!isDraggingDmPanel) return undefined;

    const handleMouseMove = (event) => {
      const nextX = dragRef.current.baseX + (event.clientX - dragRef.current.startX);
      const nextY = dragRef.current.baseY + (event.clientY - dragRef.current.startY);
      setDmPanelOffset({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => setIsDraggingDmPanel(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDmPanel]);

  const handleDmPanelDragStart = (event) => {
    if (event.target.closest('button')) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: dmPanelOffset.x,
      baseY: dmPanelOffset.y,
    };
    setIsDraggingDmPanel(true);
  };

  const handleSelectRoom = async (roomId) => {
    const room = dmRooms.find((item) => item.roomId === roomId);
    const unreadBeforeRead = Number(room?.unreadCount || 0);

    if (unreadBeforeRead > 0 && !hasShownDmReadBoundary(myUserId, roomId)) {
      setDividerUnreadCountByRoomId((prev) => ({ ...prev, [roomId]: unreadBeforeRead }));
    }

    setSelectedRoomId(roomId);
    await fetchRoomMessages(roomId, { markAsRead: true, size: 50 });
    fetchDmUnreadCount();
  };

  const handleSendDmInPanel = async () => {
    if (!selectedRoomId || !dmInput.trim() || isDmSending) return;

    setIsDmSending(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.dmRooms}/${selectedRoomId}/messages`,
        { content: dmInput.trim() },
        { headers: authHeaders, withCredentials: true }
      );

      const message = normalizeMessages([response?.data?.data])[0];
      if (message) {
        appendDmMessage(selectedRoomId, message);
        setMessagesByRoomId((prev) => ({
          ...prev,
          [selectedRoomId]: [...(prev[selectedRoomId] || []), message],
        }));

        setDmRooms((prev) => {
          const updated = prev.map((room) => (
            room.roomId === selectedRoomId
              ? {
                ...room,
                lastMessageId: message.messageId,
                lastMessageAt: message.createdAt,
                lastMessagePreview: message.content,
              }
              : room
          ));
          updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
          return updated;
        });
      }

      setDmInput('');
    } catch (error) {
      console.error('DM 전송 실패:', error);
      alert(error?.response?.data?.message || 'DM 전송에 실패했습니다.');
    } finally {
      setIsDmSending(false);
    }
  };

  const handleAuthRequiredNav = (event, path, requiresAuth = false) => {
    event.preventDefault();

    if (requiresAuth) {
      const hasSavedUser = Boolean(window.localStorage.getItem('user'));
      if (!isAuthenticated && !isLoading && !hasSavedUser) {
        alert('\uB85C\uADF8\uC778 \uD6C4, \uC774\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.');
        return;
      }
    }

    window.location.href = path;
  };

  const handleLogout = async () => {
    if (!window.confirm('로그아웃 하시겠습니까?')) return;

    try {
      await logout();
      alert('로그아웃되었습니다.');
    } catch (error) {
      console.error('로그아웃 처리 중 오류:', error);
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <>
      {isHomePage && !isHomeGnbVisible && (
        <div
          className="gnb-reveal-zone"
          onMouseEnter={() => setIsHomeGnbVisible(true)}
          aria-hidden="true"
        />
      )}

      <nav
        className={`gnb ${isHomePage ? 'gnb-home-mode' : ''} ${isHomePage && !isHomeGnbVisible ? 'gnb-home-hidden' : 'gnb-home-visible'}`}
        onMouseLeave={() => {
          if (isHomePage) {
            setIsHomeGnbVisible(false);
          }
        }}
      >
      <div
        className="gnb-container"
        onMouseEnter={() => {
          if (isHomePage) {
            setIsHomeGnbVisible(true);
          }
        }}
      >
        <div className="gnb-left">
          <Link to="/" className={`gnb-link ${location.pathname === '/' ? 'active' : ''}`} onClick={(event) => handleAuthRequiredNav(event, '/', false)}>
            <span className="gnb-icon" aria-hidden="true">{'\u{1F3E0}'}</span>
            <span className="gnb-label">HOME</span>
          </Link>

          <Link
            to="/posts"
            className={`gnb-link ${location.pathname.startsWith('/posts') ? 'active' : ''}`}
            onClick={(event) => handleAuthRequiredNav(event, '/posts', true)}
          >
            <span className="gnb-icon" aria-hidden="true">{'\u{1F4DD}'}</span>
            <span className="gnb-label">게시글</span>
          </Link>

          {isAdminUser && (
            <Link
              to="/admin/dashboard"
              className={`gnb-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              onClick={(event) => handleAuthRequiredNav(event, '/admin/dashboard', true)}
            >
              <span className="gnb-icon" aria-hidden="true">{'\u{1F6E1}'}</span>
              <span className="gnb-label">관리자</span>
            </Link>
          )}
        </div>

        <div className="gnb-right">
          {isLoading ? (
            <span className="gnb-loading">로딩 중...</span>
          ) : isAuthenticated ? (
            <>
              <button
                type="button"
                className="gnb-dm-alert-button"
                onClick={() => setIsDmPanelOpen(true)}
                title="DM 알림"
              >
                <span className="gnb-icon" aria-hidden="true">{'\u{1F514}'}</span>
                <span className="gnb-label">DM</span>
                {dmUnreadCount > 0 && (
                  <span className="gnb-dm-badge unread">{dmUnreadCount > 99 ? '99+' : dmUnreadCount}</span>
                )}
              </button>

              <Link to="/profile" className="gnb-user-info">
                <img
                  src={user?.profileImage || defaultUserImage}
                  alt="프로필"
                  className="gnb-user-avatar"
                />
                <span className="gnb-icon" aria-hidden="true">{'\u{1F464}'}</span>
                <span className="gnb-label">{user?.name}님</span>
              </Link>

              <button onClick={handleLogout} className="auth-link logout-button" type="button">
                <span className="gnb-icon" aria-hidden="true">{'\u{1F6AA}'}</span>
                <span className="gnb-label">로그아웃</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="auth-link" onClick={(e) => { e.preventDefault(); window.location.href = "/login"; }}>
                <span className="gnb-icon" aria-hidden="true">{'\u{1F510}'}</span>
                <span className="gnb-label">로그인</span>
              </Link>

              <Link to="/signup" className="auth-link signup">
                <span className="gnb-icon" aria-hidden="true">{'\u2728'}</span>
                <span className="gnb-label">회원가입</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {isDmPanelOpen && createPortal(
        <div className="gnb-dm-panel-overlay" role="presentation" onClick={() => setIsDmPanelOpen(false)}>
          <div
            className="gnb-dm-panel"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ transform: `translate(${dmPanelOffset.x}px, ${dmPanelOffset.y}px)` }}
          >
            <div className="gnb-dm-panel-head" onMouseDown={handleDmPanelDragStart}>
              <h3>DM</h3>
              <button type="button" onClick={() => setIsDmPanelOpen(false)}>닫기</button>
            </div>

            <div className="gnb-dm-panel-body">
              <aside className="gnb-dm-room-list">
                {isDmRoomsLoading ? (
                  <p>DM 방을 불러오는 중...</p>
                ) : dmRoomsError ? (
                  <p>{dmRoomsError}</p>
                ) : dmRooms.length === 0 ? (
                  <p>DM 기록이 없습니다.</p>
                ) : (
                  dmRooms.map((room) => (
                    <button
                      type="button"
                      key={room.roomId}
                      className={`gnb-dm-room-item ${selectedRoomId === room.roomId ? 'active' : ''}`}
                      onClick={() => handleSelectRoom(room.roomId)}
                    >
                      <span>
                        <img
                          src={room.opponentProfileImage || defaultUserImage}
                          alt={room.opponentName}
                        />
                        {room.opponentName}
                      </span>
                      {room.unreadCount > 0 && <strong>{room.unreadCount}</strong>}
                    </button>
                  ))
                )}
              </aside>

              <section className="gnb-dm-message-list">
                {!selectedRoomId ? (
                  <p>대화 대상을 선택하세요.</p>
                ) : isMessagesLoadingByRoomId[selectedRoomId] ? (
                  <p>메시지를 불러오는 중...</p>
                ) : (
                  <>
                    {selectedRoom && (
                      <div className="gnb-dm-conversation-head">
                        <img
                          src={selectedRoom.opponentProfileImage || defaultUserImage}
                          alt={selectedRoom.opponentName}
                          className="gnb-dm-conversation-avatar"
                        />
                        <div className="gnb-dm-conversation-meta">
                          <strong>{selectedRoom.opponentName}</strong>
                          {selectedRoomUnreadCount > 0 && (
                            <span className="gnb-dm-unread-room-badge">미읽음 {selectedRoomUnreadCount}</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="gnb-dm-message-scroll" ref={messageScrollRef}>
                      {selectedRoomMessages.length === 0 ? (
                        <p>대화 내용이 없습니다.</p>
                      ) : (
                        selectedRoomMessages.map((message) => (
                          <div key={message.messageId}>
                            {firstUnreadMessageId === message.messageId && selectedDividerUnreadCount > 0 && (
                              <div className="gnb-dm-unread-divider">
                                <span>--여기까지 읽으셨습니다.--</span>
                              </div>
                            )}
                            <div className={`gnb-dm-message-item ${message.senderId === myUserId ? 'mine' : ''}`}>
                              <p>{message.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="gnb-dm-compose">
                      <textarea
                        value={dmInput}
                        onChange={(event) => setDmInput(event.target.value)}
                        placeholder="메시지를 입력하세요."
                        maxLength={1000}
                        disabled={isDmSending}
                      />
                      <button
                        type="button"
                        onClick={handleSendDmInPanel}
                        disabled={isDmSending || !dmInput.trim()}
                      >
                        {isDmSending ? '전송 중...' : '보내기'}
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>,
        document.body
      )}
      </nav>
    </>
  );
}

export default GNB;























