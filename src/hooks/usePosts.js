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

const extractResponseData = (response) => response?.data?.data || response?.data || null;

/**
 * usePosts 커스텀 훅
 *
 * 게시글 목록 조회 및 삭제 기능을 관리합니다.
 *
 * @param {string} accessToken - JWT 액세스 토큰
 * @param {Object} options - 옵션
 * @param {boolean} options.myPostsOnly - true이면 내 게시글만 조회
 * @returns {Object} 게시글 목록 관련 상태 및 함수
 */
export function usePosts(accessToken, { myPostsOnly = false } = {}) {
  // ==========================================
  // 상태 정의
  // ==========================================
  const [posts, setPosts] = useState([]);           // 게시글 목록
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(null);         // 에러 상태

  // ==========================================
  // 게시글 목록 조회
  // ==========================================

  /**
   * 게시글 목록을 서버에서 가져옵니다.
   * myPostsOnly 옵션에 따라 전체 피드 또는 내 게시글만 조회합니다.
   */
  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // myPostsOnly에 따라 API 엔드포인트 결정
      const endpoint = myPostsOnly
        ? API_CONFIG.endpoints.myPosts
        : API_CONFIG.endpoints.posts;

      const url = `${API_CONFIG.baseUrl}${endpoint}`;

      // 헤더 구성 (인증 토큰이 있으면 포함)
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await axios.get(url, {
        headers,
        withCredentials: true
      });

      console.log('게시글 목록 조회 응답:', response.data);

      // 응답 데이터에서 게시글 배열 추출
      if (response.data?.data) {
        // 배열인 경우 바로 사용, 페이지네이션 객체인 경우 content 추출
        const postData = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data.content || [];

        const normalizedPosts = postData.map(normalizePostStats);

        // 목록 API에서 조회수/댓글수가 누락되거나 0으로 내려오는 경우를 보정하기 위해
        // 상세 API 값을 병합한다.
        const hydratedPosts = await Promise.all(
          normalizedPosts.map(async (post) => {
            if (!post?.id) return post;

            try {
              const detailUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${post.id}`;
              const detailResponse = await axios.get(detailUrl, {
                headers,
                withCredentials: true,
              });
              const latest = normalizePostStats(extractResponseData(detailResponse) || {});

              return {
                ...post,
                viewCount: latest.viewCount,
                commentCount: latest.commentCount,
              };
            } catch (detailErr) {
              console.warn('게시글 통계 보정 실패:', post.id, detailErr);
              return post;
            }
          })
        );

        setPosts(hydratedPosts);
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

  // 컴포넌트 마운트 시 게시글 조회
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // ==========================================
  // 게시글 삭제
  // ==========================================

  /**
   * 게시글을 삭제합니다. (Soft Delete)
   * @param {number} postId - 삭제할 게시글 ID
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  const deletePost = async (postId) => {
    if (!accessToken) {
      alert('로그인이 필요합니다.');
      return false;
    }

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${postId}`;
      await axios.delete(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        withCredentials: true
      });

      // 목록에서 삭제된 게시글 제거
      setPosts(prev => prev.filter(post => post.id !== postId));
      return true;
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('게시글 삭제에 실패했습니다.');
      return false;
    }
  };

  // ==========================================
  // 반환값
  // ==========================================
  return {
    posts,
    isLoading,
    error,
    fetchPosts,  // 목록 새로고침
    deletePost,
  };
}
