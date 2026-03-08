import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

import { useAuth } from '../hooks/useAuth';
import { API_CONFIG } from '../config';
import {
  appendDmMessage,
  getDmMessages,
  getLastReadMessageId,
  setDmMessages,
  setLastReadMessageId,
} from '../utils/dmStorage';
import './Gnb.css';
import defaultUserImage from '../assets/default_user.png';

function GNB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading, logout, accessToken } = useAuth();

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

  const [dmPanelOffset, setDmPanelOffset] = useState({ x: 0, y: 0 });
  const [isDraggingDmPanel, setIsDraggingDmPanel] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const myUserId = Number(user?.id || 0);
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
        : (rooms[0]?.roomId ?? null);
      setSelectedRoomId(nextSelected);

      await refreshUnreadCounts(rooms);

      if (nextSelected) {
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
  }, [isAuthenticated, myUserId, authHeaders, normalizeRooms, selectedRoomId, refreshUnreadCounts, fetchRoomMessages]);

  const selectedRoom = dmRooms.find((room) => room.roomId === selectedRoomId) || null;

  useEffect(() => {
    setSelectedRoomId(null);
    setMessagesByRoomId({});
    setDmRooms([]);
    setDmUnreadCount(0);
    setDmInput('');
  }, [myUserId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchDmRooms();
    }, 0);

    if (!isAuthenticated) {
      return () => window.clearTimeout(timeoutId);
    }

    const intervalId = window.setInterval(fetchDmRooms, 30000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, fetchDmRooms]);

  useEffect(() => {
    if (!isDmPanelOpen) return;
    fetchDmRooms();
  }, [isDmPanelOpen, fetchDmRooms]);

  useEffect(() => {
    if (!selectedRoomId || !isDmPanelOpen) return;
    fetchRoomMessages(selectedRoomId, { markAsRead: true, size: 50 });
  }, [selectedRoomId, isDmPanelOpen, fetchRoomMessages]);

  useEffect(() => {
    if (!isDmPanelOpen) {
      setDmPanelOffset({ x: 0, y: 0 });
      setDmInput('');
    }
  }, [isDmPanelOpen]);

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
    setSelectedRoomId(roomId);
    await fetchRoomMessages(roomId, { markAsRead: true, size: 50 });
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

  const handleAuthRequiredNav = (event) => {
    if (isAuthenticated) return;
    event.preventDefault();
    alert('로그인 후, 이용할 수 있습니다.');
  };

  const handleLogout = async () => {
    if (!window.confirm('로그아웃 하시겠습니까?')) return;

    try {
      await logout();
      alert('로그아웃되었습니다.');
      navigate('/');
    } catch (error) {
      console.error('로그아웃 처리 중 오류:', error);
      navigate('/');
    }
  };

  return (
    <nav className="gnb">
      <div className="gnb-container">
        <div className="gnb-left">
          <Link to="/" className={`gnb-link ${location.pathname === '/' ? 'active' : ''}`}>
            <span className="gnb-icon" aria-hidden="true">{'\u{1F3E0}'}</span>
            <span className="gnb-label">HOME</span>
          </Link>

          <Link
            to="/posts"
            className={`gnb-link ${location.pathname.startsWith('/posts') ? 'active' : ''}`}
            onClick={handleAuthRequiredNav}
          >
            <span className="gnb-icon" aria-hidden="true">{'\u{1F4DD}'}</span>
            <span className="gnb-label">게시글</span>
          </Link>

          <Link
            to="/notices"
            className={`gnb-link ${location.pathname.startsWith('/notices') ? 'active' : ''}`}
            onClick={handleAuthRequiredNav}
          >
            <span className="gnb-icon" aria-hidden="true">{'\u{1F514}'}</span>
            <span className="gnb-label">알림글</span>
          </Link>
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
                  <span className="gnb-dm-badge">{dmUnreadCount > 99 ? '99+' : dmUnreadCount}</span>
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
              <Link to="/login" className="auth-link">
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

      {isDmPanelOpen && (
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
                        </div>
                      </div>
                    )}

                    <div className="gnb-dm-message-scroll">
                      {(messagesByRoomId[selectedRoomId] || []).length === 0 ? (
                        <p>대화 내용이 없습니다.</p>
                      ) : (
                        (messagesByRoomId[selectedRoomId] || []).map((message) => (
                          <div key={message.messageId} className={`gnb-dm-message-item ${message.senderId === myUserId ? 'mine' : ''}`}>
                            <p>{message.content}</p>
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
        </div>
      )}
    </nav>
  );
}

export default GNB;
