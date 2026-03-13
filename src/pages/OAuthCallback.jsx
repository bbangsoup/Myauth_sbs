import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import './OAuthCallback.css';

/**
 * OAuthCallback 컴포넌트
 *
 * 카카오 로그인 완료 후 리다이렉트되는 콜백 페이지입니다.
 *
 * 백엔드가 두 가지 방식으로 데이터를 전달할 수 있습니다:
 *
 * 방식 1 - URL 해시(#)로 직접 전달 (현재 사용 중):
 *   /oauth/callback#accessToken=eyJ...&user={...}
 *   → 해시에서 accessToken과 user를 추출하여 바로 로그인 처리
 *
 * 방식 2 - 쿼리 파라미터로 상태 전달 (기존 방식):
 *   /oauth/callback?status=success
 *   → 토큰 교환 API를 호출하여 accessToken과 user를 받아옴
 */
function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  // UI 상태
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 중복 실행 방지 (React StrictMode 대응)
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    // 중복 실행 방지
    if (hasExecutedRef.current) {
      console.log('이미 콜백을 처리했으므로 중복 실행 방지');
      return;
    }
    hasExecutedRef.current = true;

    const handleCallback = async () => {
      try {
        console.log('=== 카카오 OAuth 콜백 처리 시작 ===');
        console.log('현재 URL:', window.location.href);

        // ==========================================
        // 1단계: URL 에러 파라미터 확인
        // ==========================================
        const errorMessage = searchParams.get('error');
        if (errorMessage) {
          console.error('카카오 로그인 실패:', decodeURIComponent(errorMessage));
          handleError(decodeURIComponent(errorMessage));
          return;
        }

        // ==========================================
        // 2단계: URL 해시(#)에서 토큰 추출 시도
        // ==========================================
        // 백엔드가 #accessToken=...&user=... 형태로 전달하는 경우
        const hash = window.location.hash;
        if (hash) {
          console.log('URL 해시 감지 - 해시에서 토큰 추출');
          handleHashCallback(hash);
          return;
        }

        // ==========================================
        // 3단계: 쿼리 파라미터에서 status 확인 (기존 방식)
        // ==========================================
        const status = searchParams.get('status');
        if (status === 'success') {
          console.log('status=success - 토큰 교환 API 호출');
          await handleTokenExchange();
          return;
        }

        // ==========================================
        // 어느 방식에도 해당하지 않는 경우
        // ==========================================
        console.error('알 수 없는 콜백 형식:', { hash, status });
        handleError('알 수 없는 오류가 발생했습니다.');

      } catch (err) {
        console.error('OAuth 콜백 처리 에러:', err);
        handleError('로그인 처리 중 오류가 발생했습니다.');
      }
    };

    /**
     * URL 해시(#)에서 accessToken과 user를 추출하여 로그인 처리
     *
     * URL 형식: /oauth/callback#accessToken=eyJ...&user={...}
     * - accessToken: JWT 액세스 토큰
     * - user: URL 인코딩된 JSON 사용자 정보
     */
    const handleHashCallback = (hash) => {
      try {
        // '#' 제거 후 파라미터 파싱
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('accessToken');
        const userParam = params.get('user');

        console.log('해시 파라미터:', { accessToken: accessToken ? '있음' : '없음', user: userParam ? '있음' : '없음' });

        // accessToken 확인
        if (!accessToken) {
          handleError('액세스 토큰이 없습니다.');
          return;
        }

        // user JSON 파싱
        if (!userParam) {
          handleError('사용자 정보가 없습니다.');
          return;
        }

        const user = JSON.parse(decodeURIComponent(userParam));
        console.log('로그인 성공 - 사용자:', user.email || user.name);

        // AuthContext에 로그인 정보 저장
        login(user, accessToken);

        alert('카카오 로그인 성공!');

        // 홈 페이지로 이동 (replace: true로 콜백 페이지를 히스토리에서 제거)
        navigate('/posts', { replace: true });

      } catch (parseError) {
        console.error('해시 데이터 파싱 실패:', parseError);
        handleError('로그인 데이터 처리 중 오류가 발생했습니다.');
      }
    };

    /**
     * 토큰 교환 API 호출 방식 (기존 방식, 백업용)
     */
    const handleTokenExchange = async () => {
      try {
        const response = await axios.post('/api/auth/kakao/exchange-token', {}, {
          withCredentials: true
        });

        if (response.data.success) {
          const { accessToken, user } = response.data.data;
          console.log('토큰 교환 성공 - 사용자:', user.email);

          login(user, accessToken);
          alert('카카오 로그인 성공!');
          navigate('/posts', { replace: true });
        } else {
          throw new Error(response.data.message || '토큰 교환 실패');
        }
      } catch (err) {
        console.error('토큰 교환 실패:', err);
        handleError('로그인 처리 중 오류가 발생했습니다.');
      }
    };

    /**
     * 에러 처리 공통 함수
     * 에러 메시지를 표시하고 3초 후 로그인 페이지로 이동
     */
    const handleError = (message) => {
      setError(message);
      setIsLoading(false);
      setTimeout(() => navigate('/login'), 3000);
    };

    handleCallback();
  }, [searchParams, navigate, login]);

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
            <div className="error-icon">⚠️</div>
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
