import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

import { useAuth } from '../hooks/useAuth';
import { API_CONFIG } from '../config';

function PostCard({ post }) {
  const { user, isAuthenticated, accessToken } = useAuth();

  const [liked, setLiked] = useState(Boolean(post?.liked ?? post?.isLiked));
  const [likeCount, setLikeCount] = useState(post?.likeCount ?? 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

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

  const handleToggleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOwner) {
      return;
    }

    if (!isAuthenticated) {
      alert('로그인 후 좋아요를 사용할 수 있습니다.');
      return;
    }

    if (isLikeLoading) return;

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
          // Local liked state and server state are out of sync: retry with opposite action.
          response = wasLiked
            ? await axios.post(url, {}, { headers, withCredentials: true })
            : await axios.delete(url, { headers, withCredentials: true });
        } else {
          throw primaryError;
        }
      }

      const responseData = response?.data?.data;

      if (typeof responseData?.liked === 'boolean') {
        setLiked(responseData.liked);
      } else {
        setLiked(targetLiked);
      }

      if (typeof responseData?.likeCount === 'number') {
        setLikeCount(responseData.likeCount);
      } else {
        setLikeCount((prev) => (targetLiked ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch (error) {
      if (error.response?.status === 409) {
        try {
          const detailUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${post.id}`;
          const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
          const detailResponse = await axios.get(detailUrl, { headers, withCredentials: true });
          const latest = detailResponse.data?.data || detailResponse.data;
          const syncedLiked = latest?.liked ?? latest?.isLiked;

          if (typeof syncedLiked === 'boolean') {
            setLiked(syncedLiked);
          } else {
            // Backend detail response may omit liked; infer from conflict direction.
            setLiked(targetLiked);
          }

          if (typeof latest?.likeCount === 'number') {
            setLikeCount(latest.likeCount);
          } else {
            setLikeCount((prev) => (targetLiked ? prev + 1 : Math.max(0, prev - 1)));
          }
          return;
        } catch (syncError) {
          console.error('좋아요 상태 재동기화 실패:', syncError);
          setLiked(targetLiked);
          setLikeCount((prev) => (targetLiked ? prev + 1 : Math.max(0, prev - 1)));
          return;
        }
      }

      console.error('좋아요 처리 실패:', error);
      alert('좋아요 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLikeLoading(false);
    }
  };

  const previewContent = post.content?.length > 150
    ? `${post.content.substring(0, 150)}...`
    : post.content;

  const authorName = post.author?.name || post.userName || '알 수 없음';
  const authorImage = post.author?.profileImage || post.userProfileImage || null;
  const isOwner = user && (
    user.id === post.userId ||
    user.id === post.author?.id ||
    user.email === post.author?.email
  );

  return (
    <Link to={`/posts/${post.id}`} className="post-card">
      <div className="post-card-header">
        <div className="post-card-author">
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
            <span className="post-card-image-count">+{(post.imageCount || post.images?.length) - 1}</span>
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
    </Link>
  );
}

export default PostCard;
