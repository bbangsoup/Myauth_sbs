import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { API_CONFIG } from '../config';
import './PostDetail.css';

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated } = useAuth();

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const fetchPost = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}`;
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

      const response = await axios.get(url, {
        headers,
        withCredentials: true,
      });

      if (response.data?.data) {
        setPost(response.data.data);
      } else {
        setPost(response.data);
      }
    } catch (err) {
      console.error('게시글 상세 조회 실패:', err);
      if (err.response?.status === 404) {
        setError('게시글을 찾을 수 없습니다.');
      } else {
        setError('게시글을 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleDelete = async () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}`;
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
      });

      alert('게시글이 삭제되었습니다.');
      navigate('/posts');
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const handleToggleLike = async () => {
    if (!post || isLikeLoading) return;

    const isOwnerPost = user && (
      user.id === post.userId ||
      user.id === post.author?.id ||
      user.email === post.author?.email
    );

    if (isOwnerPost) {
      return;
    }

    if (!isAuthenticated) {
      alert('로그인 후 좋아요를 사용할 수 있습니다.');
      return;
    }

    setIsLikeLoading(true);

    const currentlyLiked = Boolean(post.liked ?? post.isLiked);
    const targetLiked = !currentlyLiked;

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${post.id}/like`;
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

      let response;
      try {
        response = currentlyLiked
          ? await axios.delete(url, { headers, withCredentials: true })
          : await axios.post(url, {}, { headers, withCredentials: true });
      } catch (primaryError) {
        if (primaryError.response?.status === 409) {
          // Local liked state and server state are out of sync: retry opposite action.
          response = currentlyLiked
            ? await axios.post(url, {}, { headers, withCredentials: true })
            : await axios.delete(url, { headers, withCredentials: true });
        } else {
          throw primaryError;
        }
      }

      const responseData = response?.data?.data;

      setPost((prev) => {
        if (!prev) return prev;

        const nextLiked = typeof responseData?.liked === 'boolean'
          ? responseData.liked
          : targetLiked;

        const nextLikeCount = typeof responseData?.likeCount === 'number'
          ? responseData.likeCount
          : (targetLiked ? (prev.likeCount || 0) + 1 : Math.max(0, (prev.likeCount || 0) - 1));

        return {
          ...prev,
          liked: nextLiked,
          likeCount: nextLikeCount,
        };
      });
    } catch (err) {
      if (err.response?.status === 409) {
        try {
          const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${post.id}`;
          const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
          const response = await axios.get(url, { headers, withCredentials: true });
          const latest = response.data?.data || response.data;

          setPost((prev) => {
            if (!prev) return prev;
            const syncedLiked = latest?.liked ?? latest?.isLiked;
            const resolvedLiked = typeof syncedLiked === 'boolean' ? syncedLiked : targetLiked;
            const resolvedLikeCount = typeof latest?.likeCount === 'number'
              ? latest.likeCount
              : (resolvedLiked ? (prev.likeCount || 0) + 1 : Math.max(0, (prev.likeCount || 0) - 1));

            return {
              ...prev,
              ...latest,
              liked: resolvedLiked,
              likeCount: resolvedLikeCount,
            };
          });
          return;
        } catch (syncError) {
          console.error('좋아요 상태 재동기화 실패:', syncError);
          setPost((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              liked: targetLiked,
              likeCount: targetLiked ? (prev.likeCount || 0) + 1 : Math.max(0, (prev.likeCount || 0) - 1),
            };
          });
          return;
        }
      }

      console.error('좋아요 처리 실패:', err);
      alert('좋아요 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLikeLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  const authorName = post?.author?.name || post?.userName || '알 수 없음';
  const authorImage = post?.author?.profileImage || post?.userProfileImage || null;
  const isOwner = user && post && (
    user.id === post.userId ||
    user.id === post.author?.id ||
    user.email === post.author?.email
  );

  return (
    <>
      <GNB />
      <div className="post-detail-container">
        {isLoading ? (
          <div className="post-detail-loading">
            <p>게시글을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="post-detail-error">
            <p>{error}</p>
            <button onClick={() => navigate('/posts')} className="back-button">목록으로 돌아가기</button>
          </div>
        ) : post ? (
          <div className="post-detail-card">
            <div className="post-detail-header">
              <div className="post-detail-author">
                {authorImage ? (
                  <img src={authorImage} alt={authorName} className="post-detail-avatar" />
                ) : (
                  <div className="post-detail-avatar-placeholder">{authorName.charAt(0)}</div>
                )}
                <div className="post-detail-author-info">
                  <span className="post-detail-author-name">{authorName}</span>
                  <span className="post-detail-date">{formatDate(post.createdAt)}</span>
                </div>
              </div>

              {isOwner && (
                <div className="post-detail-actions">
                  <button onClick={handleDelete} className="delete-button">삭제</button>
                </div>
              )}
            </div>

            <div className="post-detail-content">
              <p>{post.content}</p>
            </div>

            {post.images && post.images.length > 0 && (
              <div className="post-detail-images">
                {post.images.map((image, index) => (
                  <div key={image.id || index} className="post-detail-image-item">
                    <img src={image.imageUrl || image.url} alt={`게시글 이미지 ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}

            <div className="post-detail-stats">
              <button
                type="button"
                className={`post-detail-stat post-like-button ${post.liked ?? post.isLiked ? 'active' : ''}`}
                onClick={handleToggleLike}
                disabled={isLikeLoading || isOwner}
                title={isOwner ? '본인 게시물은 좋아요를 누를 수 없습니다.' : '좋아요'}
              >
                {post.liked ?? post.isLiked ? '❤️' : '🤍'} {post.likeCount || 0}
              </button>
              <span className="post-detail-stat">💬 {post.commentCount || 0}</span>
              <span className="post-detail-stat">👁 {post.viewCount || 0}</span>
            </div>

            {post.visibility && post.visibility !== 'PUBLIC' && (
              <div className="post-detail-visibility">
                {post.visibility === 'PRIVATE' ? '🔒 비공개' : '👥 팔로워만'}
              </div>
            )}

            <div className="post-detail-footer">
              <button onClick={() => navigate('/posts')} className="back-button">목록으로</button>
            </div>
          </div>
        ) : null}
      </div>
      <Footer />
    </>
  );
}

export default PostDetail;
