import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

import { useAuth } from '../hooks/useAuth';
import { isAdminUser, normalizeAuthUser } from '../utils/auth';
import './OAuthCallback.css';

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasExecutedRef = useRef(false);

  const getRedirectPath = (userData) => (isAdminUser(userData) ? '/admin/dashboard' : '/posts');

  useEffect(() => {
    if (hasExecutedRef.current) {
      console.log('이미 콜백을 처리했으므로 중복 실행 방지');
      return;
    }
    hasExecutedRef.current = true;

    const handleError = (message) => {
      setError(message);
      setIsLoading(false);
      setTimeout(() => navigate('/login'), 3000);
    };

    const resolveUserAfterRefresh = async (fallbackUser, fallbackAccessToken) => {
      try {
        const refreshResponse = await axios.post('/api/refresh', {}, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        });

        if (refreshResponse.data?.success) {
          return {
            user: normalizeAuthUser(refreshResponse.data?.data?.user || fallbackUser),
            accessToken: refreshResponse.data?.data?.accessToken || fallbackAccessToken,
          };
        }
      } catch (refreshError) {
        console.warn('카카오 로그인 직후 refresh 재확인 실패:', refreshError);
      }

      return {
        user: normalizeAuthUser(fallbackUser),
        accessToken: fallbackAccessToken,
      };
    };

    const handleHashCallback = async (hash) => {
      try {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('accessToken');
        const userParam = params.get('user');

        console.log('해시 파라미터:', {
          accessToken: accessToken ? '있음' : '없음',
          user: userParam ? '있음' : '없음',
        });

        if (!accessToken) {
          handleError('액세스 토큰이 없습니다.');
          return;
        }

        if (!userParam) {
          handleError('사용자 정보가 없습니다.');
          return;
        }

        const parsedUser = normalizeAuthUser(JSON.parse(decodeURIComponent(userParam)));
        console.log('로그인 성공 - 사용자:', parsedUser.email || parsedUser.name);

        const resolved = await resolveUserAfterRefresh(parsedUser, accessToken);
        login(resolved.user, resolved.accessToken);

        alert('카카오 로그인 성공!');
        navigate(getRedirectPath(resolved.user), { replace: true });
      } catch (parseError) {
        console.error('해시 데이터 파싱 실패:', parseError);
        handleError('로그인 데이터 처리 중 오류가 발생했습니다.');
      }
    };

    const handleTokenExchange = async () => {
      try {
        const response = await axios.post('/api/auth/kakao/exchange-token', {}, {
          withCredentials: true,
        });

        if (!response.data?.success) {
          throw new Error(response.data?.message || '토큰 교환에 실패했습니다.');
        }

        const fallbackUser = normalizeAuthUser(response.data?.data?.user);
        const fallbackAccessToken = response.data?.data?.accessToken;
        const resolved = await resolveUserAfterRefresh(fallbackUser, fallbackAccessToken);

        login(resolved.user, resolved.accessToken);
        alert('카카오 로그인 성공!');
        navigate(getRedirectPath(resolved.user), { replace: true });
      } catch (exchangeError) {
        console.error('토큰 교환 실패:', exchangeError);
        handleError('로그인 처리 중 오류가 발생했습니다.');
      }
    };

    const handleCallback = async () => {
      try {
        console.log('=== 카카오 OAuth 콜백 처리 시작 ===');
        console.log('현재 URL:', window.location.href);

        const errorMessage = searchParams.get('error');
        if (errorMessage) {
          handleError(decodeURIComponent(errorMessage));
          return;
        }

        const hash = window.location.hash;
        if (hash) {
          console.log('URL 해시 감지 - 해시에서 토큰 추출');
          await handleHashCallback(hash);
          return;
        }

        const status = searchParams.get('status');
        if (status === 'success') {
          console.log('status=success - 토큰 교환 API 호출');
          await handleTokenExchange();
          return;
        }

        handleError('알 수 없는 로그인 응답입니다.');
      } catch (callbackError) {
        console.error('OAuth 콜백 처리 오류:', callbackError);
        handleError('로그인 처리 중 오류가 발생했습니다.');
      }
    };

    handleCallback();
  }, [login, navigate, searchParams]);

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-card">
        {isLoading ? (
          <>
            <div className="spinner"></div>
            <h2>로그인 처리 중...</h2>
            <p>잠시만 기다려주세요.</p>
          </>
        ) : (
          <>
            <div className="error-icon">!</div>
            <h2>로그인 실패</h2>
            <p>{error}</p>
            <p className="redirect-message">로그인 페이지로 이동합니다...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default OAuthCallback;
