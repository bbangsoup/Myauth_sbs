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
  const [comments, setComments] = useState([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [commentActionLoadingId, setCommentActionLoadingId] = useState(null);
  const [repliesByCommentId, setRepliesByCommentId] = useState({});
  const [isRepliesVisibleByCommentId, setIsRepliesVisibleByCommentId] = useState({});
  const [isRepliesLoadingByCommentId, setIsRepliesLoadingByCommentId] = useState({});
  const [replyInputsByCommentId, setReplyInputsByCommentId] = useState({});
  const [isReplySubmittingByCommentId, setIsReplySubmittingByCommentId] = useState({});

  const getAuthHeaders = useCallback(() => (
    accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  ), [accessToken]);

  const getPostCommentCount = useCallback((targetPost) => (
    Number(targetPost?.commentCount ?? targetPost?.commentsCount ?? targetPost?.commentCnt ?? 0) || 0
  ), []);

  const withPostCommentCount = useCallback((targetPost, nextCount) => {
    if (!targetPost) return targetPost;
    return {
      ...targetPost,
      commentCount: nextCount,
      commentsCount: nextCount,
      commentCnt: nextCount,
    };
  }, []);

  const normalizeComment = useCallback((comment) => {
    if (!comment || typeof comment !== 'object') return comment;

    const deleted = Boolean(
      comment.isDeleted
      ?? comment.deleted
      ?? (typeof comment.status === 'string' && comment.status.toUpperCase() === 'DELETED')
    );

    return {
      ...comment,
      content: comment.content || '',
      createdAt: comment.createdAt || comment.updatedAt || null,
      authorName: comment.author?.name || comment.userName || comment.writerName || '알 수 없음',
      authorImage: comment.author?.profileImage || comment.userProfileImage || comment.writerProfileImage || null,
      authorId: comment.author?.id || comment.userId || comment.writerId || null,
      parentCommentId: comment.parentCommentId || comment.parentId || comment.parent?.id || null,
      replyCount: Number(comment.replyCount ?? comment.repliesCount ?? comment.replyCnt ?? 0) || 0,
      isDeleted: deleted,
    };
  }, []);

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

  const fetchComments = useCallback(async () => {
    setIsCommentsLoading(true);
    setCommentsError(null);

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}/comments?page=0&size=50`;
      const response = await axios.get(url, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      const payload = response?.data?.data;
      const content = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.content) ? payload.content : []);

      const normalizedComments = content.map(normalizeComment);
      setComments(normalizedComments);
      if (normalizedComments.length === 0) {
        setPost((prev) => (prev ? withPostCommentCount(prev, 0) : prev));
      }
    } catch (err) {
      console.error('댓글 목록 조회 실패:', err);
      setCommentsError('댓글을 불러오는데 실패했습니다.');
      setComments([]);
    } finally {
      setIsCommentsLoading(false);
    }
  }, [id, getAuthHeaders, normalizeComment, withPostCommentCount]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

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

  const handleCreateComment = async () => {
    if (!isAuthenticated) {
      alert('로그인 후 댓글을 작성할 수 있습니다.');
      return;
    }

    const content = commentInput.trim();
    if (!content) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    setIsCommentSubmitting(true);
    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}/comments`;
      const response = await axios.post(
        url,
        { content },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      const created = normalizeComment(response?.data?.data);
      if (created?.id) {
        setComments((prev) => [created, ...prev]);
      } else {
        await fetchComments();
      }

      setPost((prev) => (
        prev ? withPostCommentCount(prev, getPostCommentCount(prev) + 1) : prev
      ));
      setCommentInput('');
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content || '');
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleUpdateComment = async (commentId) => {
    const content = editingContent.trim();
    if (!content) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    setCommentActionLoadingId(commentId);
    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.comments}/${commentId}`;
      const response = await axios.put(
        url,
        { content },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      const updated = normalizeComment(response?.data?.data);

      setComments((prev) => prev.map((comment) => (
        comment.id === commentId ? { ...comment, ...updated } : comment
      )));
      setRepliesByCommentId((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          next[key] = (next[key] || []).map((reply) => (
            reply.id === commentId ? { ...reply, ...updated } : reply
          ));
        });
        return next;
      });
      cancelEditComment();
    } catch (err) {
      console.error('댓글 수정 실패:', err);
      alert('댓글 수정에 실패했습니다.');
    } finally {
      setCommentActionLoadingId(null);
    }
  };

  const handleDeleteComment = async (commentId, parentCommentId = null) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    setCommentActionLoadingId(commentId);
    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.comments}/${commentId}`;
      await axios.delete(url, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      if (parentCommentId) {
        await fetchReplies(parentCommentId);
        setComments((prev) => prev.map((comment) => (
          comment.id === parentCommentId
            ? { ...comment, replyCount: Math.max(0, (Number(comment.replyCount) || 0) - 1) }
            : comment
        )));
      } else {
        await fetchComments();
      }
      setPost((prev) => (
        prev ? withPostCommentCount(prev, Math.max(0, getPostCommentCount(prev) - 1)) : prev
      ));
      await fetchPost();
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제에 실패했습니다.');
    } finally {
      setCommentActionLoadingId(null);
    }
  };

  const fetchReplies = useCallback(async (commentId) => {
    setIsRepliesLoadingByCommentId((prev) => ({ ...prev, [commentId]: true }));
    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.comments}/${commentId}/replies`;
      const response = await axios.get(url, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      const payload = response?.data?.data;
      const replyList = Array.isArray(payload) ? payload.map(normalizeComment) : [];
      setRepliesByCommentId((prev) => ({ ...prev, [commentId]: replyList }));
      return replyList;
    } catch (err) {
      console.error('대댓글 목록 조회 실패:', err);
      setRepliesByCommentId((prev) => ({ ...prev, [commentId]: [] }));
      return [];
    } finally {
      setIsRepliesLoadingByCommentId((prev) => ({ ...prev, [commentId]: false }));
    }
  }, [getAuthHeaders, normalizeComment]);

  const toggleReplies = async (commentId) => {
    const visible = Boolean(isRepliesVisibleByCommentId[commentId]);
    if (visible) {
      setIsRepliesVisibleByCommentId((prev) => ({ ...prev, [commentId]: false }));
      return;
    }

    setIsRepliesVisibleByCommentId((prev) => ({ ...prev, [commentId]: true }));
    if (!Array.isArray(repliesByCommentId[commentId])) {
      await fetchReplies(commentId);
    }
  };

  const handleCreateReply = async (commentId) => {
    if (!isAuthenticated) {
      alert('로그인 후 답글을 작성할 수 있습니다.');
      return;
    }

    const content = (replyInputsByCommentId[commentId] || '').trim();
    if (!content) {
      alert('답글 내용을 입력해주세요.');
      return;
    }

    setIsReplySubmittingByCommentId((prev) => ({ ...prev, [commentId]: true }));
    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.comments}/${commentId}/replies`;
      const response = await axios.post(
        url,
        { content },
        { headers: getAuthHeaders(), withCredentials: true }
      );

      const created = normalizeComment(response?.data?.data);
      if (created?.id) {
        setRepliesByCommentId((prev) => ({
          ...prev,
          [commentId]: [created, ...(prev[commentId] || [])],
        }));
      } else {
        await fetchReplies(commentId);
      }

      setComments((prev) => prev.map((comment) => (
        comment.id === commentId ? { ...comment, replyCount: (Number(comment.replyCount) || 0) + 1 } : comment
      )));
      setPost((prev) => (
        prev ? withPostCommentCount(prev, getPostCommentCount(prev) + 1) : prev
      ));
      setReplyInputsByCommentId((prev) => ({ ...prev, [commentId]: '' }));
      setIsRepliesVisibleByCommentId((prev) => ({ ...prev, [commentId]: true }));
    } catch (err) {
      console.error('대댓글 작성 실패:', err);
      alert('대댓글 작성에 실패했습니다.');
    } finally {
      setIsReplySubmittingByCommentId((prev) => ({ ...prev, [commentId]: false }));
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
  const totalCommentCount = getPostCommentCount(post);
  const isOwner = user && post && (
    user.id === post.userId ||
    user.id === post.author?.id ||
    user.email === post.author?.email
  );
  const isCommentOwner = (comment) => Boolean(
    user && (
      user.id === comment.authorId ||
      user.id === comment.userId ||
      user.email === comment.author?.email
    )
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
              <span className="post-detail-stat">💬 {totalCommentCount}</span>
              <span className="post-detail-stat">👁 {post.viewCount || 0}</span>
            </div>

            <section className="post-comments-section">
              <h3 className="post-comments-title">댓글</h3>

              <div className="post-comment-form">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={isAuthenticated ? '댓글을 입력하세요.' : '로그인 후 댓글을 작성할 수 있습니다.'}
                  disabled={!isAuthenticated || isCommentSubmitting}
                  maxLength={1000}
                />
                <button
                  type="button"
                  onClick={handleCreateComment}
                  disabled={!isAuthenticated || isCommentSubmitting || !commentInput.trim()}
                >
                  {isCommentSubmitting ? '등록 중...' : '댓글 등록'}
                </button>
              </div>

              {isCommentsLoading ? (
                <p className="post-comments-message">댓글을 불러오는 중...</p>
              ) : commentsError ? (
                <div className="post-comments-error">
                  <p>{commentsError}</p>
                  <button type="button" onClick={fetchComments}>다시 시도</button>
                </div>
              ) : comments.length === 0 ? (
                <p className="post-comments-message">아직 댓글이 없습니다.</p>
              ) : (
                <ul className="post-comment-list">
                  {comments.map((comment) => {
                    const canManage = isCommentOwner(comment) && !comment.isDeleted;
                    const isEditing = editingCommentId === comment.id;
                    const isBusy = commentActionLoadingId === comment.id;
                    const repliesVisible = Boolean(isRepliesVisibleByCommentId[comment.id]);
                    const replies = repliesByCommentId[comment.id] || [];
                    const isRepliesLoading = Boolean(isRepliesLoadingByCommentId[comment.id]);
                    const replyInput = replyInputsByCommentId[comment.id] || '';
                    const isReplySubmitting = Boolean(isReplySubmittingByCommentId[comment.id]);
                    const totalReplyCount = Math.max(Number(comment.replyCount) || 0, replies.length);

                    return (
                      <li key={comment.id} className="post-comment-item">
                        <div className="post-comment-head">
                          <div className="post-comment-author-wrap">
                            {comment.authorImage ? (
                              <img src={comment.authorImage} alt={comment.authorName} className="post-comment-avatar" />
                            ) : (
                              <div className="post-comment-avatar-placeholder">{comment.authorName.charAt(0)}</div>
                            )}
                            <div className="post-comment-meta">
                              <span className="post-comment-author">{comment.authorName}</span>
                              <span className="post-comment-date">{formatDate(comment.createdAt)}</span>
                            </div>
                          </div>
                          {canManage && !isEditing && (
                            <div className="post-comment-actions">
                              <button type="button" onClick={() => startEditComment(comment)} disabled={isBusy}>수정</button>
                              <button type="button" onClick={() => handleDeleteComment(comment.id)} disabled={isBusy}>삭제</button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="post-comment-edit">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              maxLength={1000}
                            />
                            <div className="post-comment-edit-actions">
                              <button
                                type="button"
                                onClick={() => handleUpdateComment(comment.id)}
                                disabled={isBusy || !editingContent.trim()}
                              >
                                저장
                              </button>
                              <button type="button" onClick={cancelEditComment} disabled={isBusy}>취소</button>
                            </div>
                          </div>
                        ) : (
                          <p className={`post-comment-content ${comment.isDeleted ? 'deleted' : ''}`}>
                            {comment.isDeleted ? '삭제된 댓글입니다.' : comment.content}
                          </p>
                        )}

                        <div className="post-reply-controls">
                          <button type="button" onClick={() => toggleReplies(comment.id)}>
                            {repliesVisible ? '답글 숨기기' : `답글 보기 (${totalReplyCount})`}
                          </button>
                          {!comment.isDeleted && isAuthenticated && (
                            <button
                              type="button"
                              onClick={() => setIsRepliesVisibleByCommentId((prev) => ({ ...prev, [comment.id]: true }))}
                            >
                              답글 작성
                            </button>
                          )}
                        </div>

                        {repliesVisible && (
                          <div className="post-reply-section">
                            {isRepliesLoading ? (
                              <p className="post-comments-message">답글을 불러오는 중...</p>
                            ) : (
                              <>
                                {replies.length > 0 && (
                                  <ul className="post-reply-list">
                                    {replies.map((reply) => {
                                      const canManageReply = isCommentOwner(reply) && !reply.isDeleted;
                                      const isEditingReply = editingCommentId === reply.id;
                                      const isBusyReply = commentActionLoadingId === reply.id;

                                      return (
                                        <li key={reply.id} className="post-reply-item">
                                          <div className="post-comment-head">
                                            <div className="post-comment-author-wrap">
                                              {reply.authorImage ? (
                                                <img src={reply.authorImage} alt={reply.authorName} className="post-comment-avatar" />
                                              ) : (
                                                <div className="post-comment-avatar-placeholder">{reply.authorName.charAt(0)}</div>
                                              )}
                                              <div className="post-comment-meta">
                                                <span className="post-comment-author">{reply.authorName}</span>
                                                <span className="post-comment-date">{formatDate(reply.createdAt)}</span>
                                              </div>
                                            </div>
                                            {canManageReply && !isEditingReply && (
                                              <div className="post-comment-actions">
                                                <button type="button" onClick={() => startEditComment(reply)} disabled={isBusyReply}>수정</button>
                                                <button type="button" onClick={() => handleDeleteComment(reply.id, comment.id)} disabled={isBusyReply}>삭제</button>
                                              </div>
                                            )}
                                          </div>

                                          {isEditingReply ? (
                                            <div className="post-comment-edit">
                                              <textarea
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value)}
                                                maxLength={1000}
                                              />
                                              <div className="post-comment-edit-actions">
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateComment(reply.id)}
                                                  disabled={isBusyReply || !editingContent.trim()}
                                                >
                                                  저장
                                                </button>
                                                <button type="button" onClick={cancelEditComment} disabled={isBusyReply}>취소</button>
                                              </div>
                                            </div>
                                          ) : (
                                            <p className={`post-comment-content ${reply.isDeleted ? 'deleted' : ''}`}>
                                              {reply.isDeleted ? '삭제된 댓글입니다.' : reply.content}
                                            </p>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}

                                {!comment.isDeleted && (
                                  <div className="post-reply-form">
                                    <textarea
                                      value={replyInput}
                                      onChange={(e) => setReplyInputsByCommentId((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                                      placeholder={isAuthenticated ? '답글을 입력하세요.' : '로그인 후 답글을 작성할 수 있습니다.'}
                                      disabled={!isAuthenticated || isReplySubmitting}
                                      maxLength={1000}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleCreateReply(comment.id)}
                                      disabled={!isAuthenticated || isReplySubmitting || !replyInput.trim()}
                                    >
                                      {isReplySubmitting ? '등록 중...' : '답글 등록'}
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

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
