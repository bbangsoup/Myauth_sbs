import { useEffect, useState } from 'react';
import axios from 'axios';

import { useAuth } from '../hooks/useAuth';
import { API_CONFIG } from '../config';
import { appendDmMessage, upsertDmRoom } from '../utils/dmStorage';

function PostCard({ post, detailPathPrefix = '/posts', listIndex = -1 }) {
  const { user, isAuthenticated, accessToken } = useAuth();

  const [liked, setLiked] = useState(Boolean(post?.liked ?? post?.isLiked));
  const [likeCount, setLikeCount] = useState(post?.likeCount ?? 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isDmConfirmOpen, setIsDmConfirmOpen] = useState(false);
  const [isDmWindowOpen, setIsDmWindowOpen] = useState(false);
  const [dmMessage, setDmMessage] = useState('');
  const [isDmSending, setIsDmSending] = useState(false);

  useEffect(() => {
    setLiked(Boolean(post?.liked ?? post?.isLiked));
    setLikeCount(post?.likeCount ?? 0);
  }, [post?.id, post?.liked, post?.isLiked, post?.likeCount]);

  const formatTime = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;

    return date.toLocaleDateString('ko-KR');
  };

  const authorName = post.author?.name || post.userName || '알 수 없음';
  const authorImage = post.author?.profileImage || post.userProfileImage || null;
  const isOwner = Boolean(
    user && (
      user.id === post.userId ||
      user.id === post.author?.id ||
      user.email === post.author?.email
    )
  );
  const targetUserId = post?.author?.id || post?.userId || null;

  const handleOpenDetail = () => {
    const targetPath = `${detailPathPrefix}/${post.id}`;

    if (listIndex === 1) {
      console.log('Second post card clicked:', {
        id: post?.id,
        authorName,
        content: post?.content,
        targetPath,
      });
    }

    window.location.href = targetPath;
  };

  const handleCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenDetail();
    }
  };

  const handleToggleLike = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isOwner) {
      return;
    }

    if (!isAuthenticated) {
      alert('로그인 후 좋아요를 사용할 수 있습니다.');
      return;
    }

    if (isLikeLoading) {
      return;
    }

    setIsLikeLoading(true);

    const wasLiked = liked;
    const targetLiked = !wasLiked;

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${post.id}/like`;
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

      let response;
      try {
        response = wasLiked
          ? await axios.delete(url, { headers, withCredentials: true })
          : await axios.post(url, {}, { headers, withCredentials: true });
      } catch (primaryError) {
        if (primaryError.response?.status === 409) {
          response = wasLiked
            ? await axios.post(url, {}, { headers, withCredentials: true })
            : await axios.delete(url, { headers, withCredentials: true });
        } else {
          throw primaryError;
        }
      }

      const responseData = response?.data?.data;

      setLiked(typeof responseData?.liked === 'boolean' ? responseData.liked : targetLiked);
      setLikeCount(
        typeof responseData?.likeCount === 'number'
          ? responseData.likeCount
          : (targetLiked ? likeCount + 1 : Math.max(0, likeCount - 1))
      );
    } catch (error) {
      if (error.response?.status === 409) {
        try {
          const detailUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${post.id}`;
          const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
          const detailResponse = await axios.get(detailUrl, { headers, withCredentials: true });
          const latest = detailResponse.data?.data || detailResponse.data;
          const syncedLiked = latest?.liked ?? latest?.isLiked;

          setLiked(typeof syncedLiked === 'boolean' ? syncedLiked : targetLiked);
          setLikeCount(
            typeof latest?.likeCount === 'number'
              ? latest.likeCount
              : (targetLiked ? likeCount + 1 : Math.max(0, likeCount - 1))
          );
          return;
        } catch (syncError) {
          console.error('좋아요 상태 동기화 실패:', syncError);
        }
      }

      console.error('좋아요 처리 실패:', error);
      alert('좋아요 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleOpenDmConfirm = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isOwner || !targetUserId) {
      return;
    }

    setIsDmConfirmOpen(true);
  };

  const handleAuthorKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenDmConfirm(event);
    }
  };

  const handleDmSend = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      alert('로그인 후 DM을 보낼 수 있습니다.');
      return;
    }

    const content = dmMessage.trim();
    if (!content) {
      alert('메시지 내용을 입력해주세요.');
      return;
    }

    if (!targetUserId) {
      alert('대상 사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setIsDmSending(true);

    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

      const roomResponse = await axios.post(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.dmRooms}`,
        { targetUserId },
        { headers, withCredentials: true }
      );

      const roomId = roomResponse?.data?.data?.roomId;
      const roomData = roomResponse?.data?.data;

      if (!roomId) {
        throw new Error('DM 방 정보를 확인할 수 없습니다.');
      }

      const messageResponse = await axios.post(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.dmRooms}/${roomId}/messages`,
        { content },
        { headers, withCredentials: true }
      );

      const sentMessage = messageResponse?.data?.data;

      if (sentMessage?.messageId) {
        appendDmMessage(roomId, {
          messageId: sentMessage.messageId,
          roomId: sentMessage.roomId || roomId,
          senderId: sentMessage.senderId || user?.id,
          senderName: sentMessage.senderName || user?.name || '',
          senderProfileImage: sentMessage.senderProfileImage || user?.profileImage || null,
          content: sentMessage.content || content,
          createdAt: sentMessage.createdAt || new Date().toISOString(),
        });
      }

      upsertDmRoom({
        roomId,
        user1Id: roomData?.user1Id ?? Math.min(Number(user?.id || 0), Number(targetUserId)),
        user2Id: roomData?.user2Id ?? Math.max(Number(user?.id || 0), Number(targetUserId)),
        lastMessageId: sentMessage?.messageId ?? roomData?.lastMessageId ?? null,
        lastMessageAt: sentMessage?.createdAt ?? roomData?.lastMessageAt ?? new Date().toISOString(),
        peerByUserId: {
          [user?.id]: {
            id: targetUserId,
            name: authorName,
            profileImage: authorImage,
          },
          [targetUserId]: {
            id: user?.id,
            name: user?.name,
            profileImage: user?.profileImage || null,
          },
        },
      });

      alert('메시지를 전송했습니다.');
      setDmMessage('');
      setIsDmWindowOpen(false);
    } catch (error) {
      console.error('DM 전송 실패:', error);
      alert(error?.response?.data?.message || error.message || 'DM 전송에 실패했습니다.');
    } finally {
      setIsDmSending(false);
    }
  };

  const previewContent = post.content?.length > 150
    ? `${post.content.substring(0, 150)}...`
    : post.content;

  return (
    <>
      <article
        className="post-card"
        onClick={handleOpenDetail}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="post-card-header">
          <div
            className={`post-card-author ${!isOwner ? 'post-card-author-dm' : ''}`}
            onClick={!isOwner ? handleOpenDmConfirm : undefined}
            onKeyDown={!isOwner ? handleAuthorKeyDown : undefined}
            role={!isOwner ? 'button' : undefined}
            tabIndex={!isOwner ? 0 : undefined}
            title={!isOwner ? '클릭하여 DM 보내기' : undefined}
          >
            {authorImage ? (
              <img src={authorImage} alt={authorName} className="post-card-avatar" />
            ) : (
              <div className="post-card-avatar-placeholder">{authorName.charAt(0)}</div>
            )}
            <span className="post-card-author-name">{authorName}</span>
          </div>
          <span className="post-card-time">{formatTime(post.createdAt)}</span>
        </div>

        <div className="post-card-content">
          <p>{previewContent}</p>
        </div>

        {(post.thumbnailUrl || (post.images && post.images.length > 0)) && (
          <div className="post-card-thumbnail">
            <img
              src={post.thumbnailUrl || post.images[0]?.imageUrl || post.images[0]?.thumbnailUrl}
              alt="게시글 이미지"
            />
            {(post.imageCount > 1 || (post.images && post.images.length > 1)) && (
              <span className="post-card-image-count">
                +{(post.imageCount || post.images?.length) - 1}
              </span>
            )}
          </div>
        )}

        <div className="post-card-footer">
          <button
            type="button"
            className={`post-card-stat post-card-like-button ${liked ? 'active' : ''}`}
            onClick={handleToggleLike}
            disabled={isLikeLoading || isOwner}
            title={isOwner ? '본인 게시물은 좋아요를 누를 수 없습니다.' : '좋아요'}
          >
            {liked ? '❤️' : '🤍'} {likeCount}
          </button>
          <span className="post-card-stat">💬 {post.commentCount || 0}</span>
          <span className="post-card-stat">👁 {post.viewCount || 0}</span>
        </div>
      </article>

      {isDmConfirmOpen && (
        <div
          className="dm-modal-overlay"
          role="presentation"
          onClick={() => setIsDmConfirmOpen(false)}
        >
          <div
            className="dm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="DM 안내"
            onClick={(event) => event.stopPropagation()}
          >
            <p>DM을 보내시겠습니까?</p>
            <div className="dm-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setIsDmConfirmOpen(false);
                  setDmMessage('');
                  setIsDmWindowOpen(true);
                }}
              >
                예
              </button>
              <button type="button" onClick={() => setIsDmConfirmOpen(false)}>
                아니오
              </button>
            </div>
          </div>
        </div>
      )}

      {isDmWindowOpen && (
        <div
          className="dm-modal-overlay"
          role="presentation"
          onClick={() => !isDmSending && setIsDmWindowOpen(false)}
        >
          <div
            className="dm-modal dm-window"
            role="dialog"
            aria-modal="true"
            aria-label="DM 창"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{authorName} 님에게 DM</h3>
            <textarea
              value={dmMessage}
              onChange={(event) => setDmMessage(event.target.value)}
              placeholder="메시지를 입력하세요."
              maxLength={1000}
              disabled={isDmSending}
            />
            <div className="dm-modal-actions">
              <button
                type="button"
                onClick={handleDmSend}
                disabled={isDmSending || !dmMessage.trim()}
              >
                {isDmSending ? '전송 중...' : '보내기'}
              </button>
              <button
                type="button"
                onClick={() => setIsDmWindowOpen(false)}
                disabled={isDmSending}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PostCard;
