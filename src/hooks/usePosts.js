import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config';

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizePostStats = (post) => {
  if (!post || typeof post !== 'object') return post;

  const normalizedViewCount = pickFirstDefined(
    post.viewCount,
    post.views,
    post.viewCnt,
    post.viewsCount,
    post.readCount,
    post.view_count
  );

  const normalizedCommentCount = pickFirstDefined(
    post.commentCount,
    post.commentsCount,
    post.commentCnt,
    post.comments_count,
    post.comment_count
  );

  return {
    ...post,
    viewCount: toSafeNumber(normalizedViewCount, 0),
    commentCount: toSafeNumber(normalizedCommentCount, 0),
  };
};

export function usePosts(accessToken, { myPostsOnly = false } = {}) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = myPostsOnly
        ? API_CONFIG.endpoints.myPosts
        : API_CONFIG.endpoints.posts;

      const url = `${API_CONFIG.baseUrl}${endpoint}`;
      const headers = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await axios.get(url, {
        headers,
        withCredentials: true,
      });

      if (response.data?.data) {
        const postData = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data.content || [];

        setPosts(postData.map(normalizePostStats));
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error('게시글 목록 조회 실패:', err);
      setError('게시글을 불러오는데 실패했습니다.');
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, myPostsOnly]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const deletePost = async (postId) => {
    if (!accessToken) {
      alert('로그인이 필요합니다.');
      return false;
    }

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${postId}`;
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
      });

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      return true;
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('게시글 삭제에 실패했습니다.');
      return false;
    }
  };

  return {
    posts,
    isLoading,
    error,
    fetchPosts,
    deletePost,
  };
}
