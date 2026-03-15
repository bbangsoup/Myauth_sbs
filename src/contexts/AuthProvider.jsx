import { useState, useEffect } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import { normalizeAuthUser } from '../utils/auth';

/**
 * AuthProvider 컴포넌트
 *
 * 인증 상태를 관리하고 하위 컴포넌트들에게 인증 정보를 제공합니다.
 *
 * @param {Object} props - 컴포넌트 props
 * @param {ReactNode} props.children - 하위 컴포넌트들
 */
export function AuthProvider({ children }) {
  // 사용자 정보를 저장하는 상태
  // user 객체: { id, email, name, role }
  const [user, setUser] = useState(null);

  // accessToken을 저장하는 상태
  // JWT 토큰 문자열
  const [accessToken, setAccessToken] = useState(null);

  // 로딩 상태 (초기 로드 시 localStorage에서 데이터를 불러오는 동안)
  const [isLoading, setIsLoading] = useState(true);

  /**
   * useEffect: 컴포넌트 마운트 시 /refresh API를 호출하여 인증 정보 복원
   *
   * 브라우저를 새로고침해도 로그인 상태가 유지되도록
   * HTTP-only 쿠키에 저장된 refreshToken을 사용하여
   * 서버로부터 새로운 accessToken을 발급받습니다.
   *
   * 처리 과정:
   * 1. localStorage에 사용자 정보가 있는지 확인 (로그인 이력 확인)
   * 2. 사용자 정보가 있으면 /api/refresh API 호출 (withCredentials: true로 쿠키 포함)
   * 3. 서버가 refreshToken 쿠키를 확인하고 유효하면 새 accessToken 발급
   * 4. 성공 시 사용자 정보와 accessToken을 상태에 저장
   * 5. 실패 시 (refreshToken 만료) localStorage 정리하고 로그아웃 상태 유지
   * 6. localStorage에 사용자 정보가 없으면 API 호출 없이 로그아웃 상태 유지
   */
  useEffect(() => {
    // async 함수를 정의하여 API 호출
    const checkAuth = async () => {
      // ========================================
      // 🔑 중요: 이미 로그인된 상태라면 refresh 호출 생략
      // ========================================
      // user와 accessToken이 이미 메모리에 있다면 (예: 카카오 로그인 직후)
      // /refresh API를 호출할 필요가 없음
      if (user && accessToken) {
        console.log('이미 로그인된 상태 - /refresh API 호출 생략');
        setIsLoading(false);
        return;
      }

      // localStorage에서 저장된 사용자 정보 확인
      const savedUser = localStorage.getItem('user');

      // 사용자 정보가 없으면 로그인 이력이 없는 것이므로 API 호출 불필요
      if (!savedUser) {
        console.log('로그인 이력 없음 - /refresh API 호출 생략');
        setIsLoading(false);
        return;
      }

      // 사용자 정보가 있으면 /refresh API 호출하여 토큰 갱신 시도
      // (페이지 새로고침 시나리오: localStorage에는 user가 있지만 메모리에는 없음)
      try {
        console.log('=== /api/refresh 호출 (페이지 새로고침) ===');
        console.log('localStorage의 user:', savedUser);
        console.log('현재 브라우저 쿠키:', document.cookie);

        // /api/refresh 엔드포인트 호출
        // withCredentials: true로 HTTP-only 쿠키(refreshToken) 포함
        const response = await axios.post('/api/refresh', {}, {
          withCredentials: true
        });

        console.log('=== /api/refresh 응답 성공 ===');
        console.log('응답 데이터:', response.data);

        // 서버 응답 확인
        if (response.data.success) {
          // 토큰 갱신 성공: 사용자 정보와 새 accessToken 저장
          const token = response.data.data.accessToken;

          // 백엔드가 user 정보를 반환하는 경우와 안 하는 경우 모두 처리
          let userData = response.data.data.user;

          // 백엔드가 user 정보를 반환하지 않으면 localStorage에서 가져옴
          if (!userData) {
            console.log('백엔드가 user 정보를 반환하지 않음 - localStorage에서 복원');
            userData = normalizeAuthUser(JSON.parse(savedUser));
          }

          userData = normalizeAuthUser(userData);

          console.log('상태 업데이트 전 - user:', user);
          console.log('상태 업데이트 전 - accessToken:', accessToken);
          console.log('새로 설정할 userData:', userData);
          console.log('새로 설정할 token:', token);

          setUser(userData);
          setAccessToken(token);

          // localStorage에는 사용자 정보만 저장 (UX 개선용, accessToken은 저장하지 않음)
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('토큰 갱신 성공 - 상태 업데이트 완료');
        } else {
          // 토큰 갱신 실패: 로그아웃 상태 유지
          console.log('토큰 갱신 실패:', response.data.message);
          // localStorage 정리 (만료된 정보 제거)
          localStorage.removeItem('user');
        }
      } catch (error) {
        // refreshToken이 만료되었거나 유효하지 않은 경우
        console.error('=== /api/refresh 요청 실패 ===');
        console.error('에러 상태 코드:', error.response?.status);
        console.error('에러 응답 데이터:', error.response?.data);
        console.error('에러 헤더:', error.response?.headers);
        console.error('전체 에러:', error);

        // localStorage 정리 (만료된 정보 제거)
        localStorage.removeItem('user');
      } finally {
        // 로딩 완료 (성공/실패 관계없이 실행)
        setIsLoading(false);
      }
    };

    // async 함수 실행
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 배열: 컴포넌트 마운트 시 한 번만 실행 (user, accessToken은 의도적으로 제외)

  /**
   * login 함수
   *
   * 로그인 성공 시 호출되는 함수입니다.
   * 서버로부터 받은 사용자 정보와 토큰을 저장합니다.
   *
   * @param {Object} userData - 서버로부터 받은 사용자 정보
   * @param {string} token - accessToken
   */
  const login = (userData, token) => {
    // 상태 업데이트
    const normalizedUser = normalizeAuthUser(userData);

    setUser(normalizedUser);
    setAccessToken(token);

    // localStorage에는 사용자 정보만 저장 (UX 개선용)
    // accessToken은 보안을 위해 메모리(state)에만 저장
    // 페이지 새로고침 시에는 /refresh API를 통해 새 토큰 발급
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  /**
   * logout 함수
   *
   * 로그아웃 시 호출되는 함수입니다.
   * 서버에 로그아웃 요청을 보내고 저장된 모든 인증 정보를 삭제합니다.
   *
   * 처리 과정:
   * 1. 백엔드 /api/logout 엔드포인트 호출 (HTTP-only 쿠키의 refreshToken 삭제)
   * 2. 프론트엔드 상태 초기화 (user, accessToken)
   * 3. localStorage 정리
   */
  const logout = async () => {
    try {
      // 백엔드에 로그아웃 요청
      // - HTTP-only 쿠키의 refreshToken을 삭제하기 위해 서버 호출 필요
      // - withCredentials: true로 쿠키 전송
      await axios.post('/api/logout', {}, {
        withCredentials: true
      });

      console.log('서버 로그아웃 성공');
    } catch (error) {
      // 서버 로그아웃 실패 시에도 클라이언트 상태는 정리
      console.error('서버 로그아웃 실패:', error);
      console.log('클라이언트 상태만 정리합니다.');
    } finally {
      // 서버 응답 성공/실패 관계없이 클라이언트 상태 정리
      // (네트워크 오류나 서버 에러가 있어도 사용자는 로그아웃된 것처럼 보여야 함)

      // 상태 초기화
      setUser(null);
      setAccessToken(null);

      // localStorage 정리 (사용자 정보만 제거)
      localStorage.removeItem('user');

      console.log('클라이언트 로그아웃 완료');
    }
  };

  /**
   * updateToken 함수
   *
   * accessToken을 갱신하는 함수입니다.
   * 토큰 갱신 API 호출 후 새로운 토큰을 저장할 때 사용합니다.
   *
   * @param {string} newToken - 새로운 accessToken
   */
  const updateToken = (newToken) => {
    // accessToken은 메모리(state)에만 저장
    // localStorage에는 저장하지 않음 (보안 강화)
    setAccessToken(newToken);
  };

  /**
   * refreshAccessToken 함수
   *
   * HTTP-only 쿠키에 저장된 Refresh Token을 사용하여
   * 새로운 Access Token을 발급받는 함수입니다.
   *
   * @returns {Promise<string>} - 새로운 accessToken
   * @throws {Error} - 토큰 갱신 실패 시 에러 발생
   *
   * 사용 시나리오:
   * 1. 카카오 소셜 로그인 콜백 처리 시
   * 2. Access Token 만료 시 자동 갱신
   * 3. 페이지 새로고침 시 인증 정보 복원
   */
  const refreshAccessToken = async () => {
    try {
      // 디버깅: 현재 쿠키 확인
      console.log('=== /api/refresh 호출 시작 ===');
      console.log('현재 쿠키:', document.cookie);
      console.log('withCredentials: true');

      // /api/refresh 엔드포인트 호출
      // withCredentials: true로 HTTP-only 쿠키(refreshToken)를 자동으로 전송
      // 요청 바디는 빈 객체 {} (일부 백엔드는 null을 받지 않을 수 있음)
      const response = await axios.post('/api/refresh', {}, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('=== /api/refresh 응답 성공 ===');
      console.log('응답 데이터:', response.data);

      // 서버 응답 확인
      if (response.data.success) {
        // 토큰 갱신 성공: 사용자 정보와 새 accessToken 저장
        // response.data.data 구조: { accessToken, user: { id, email, name, role } }
        const newAccessToken = response.data.data.accessToken;
        const userData = normalizeAuthUser(response.data.data.user);

        // 상태 업데이트
        setUser(userData);
        setAccessToken(newAccessToken);

        // localStorage에는 사용자 정보만 저장 (UX 개선용)
        localStorage.setItem('user', JSON.stringify(userData));

        console.log('Access Token 갱신 성공');

        // 새로운 accessToken 반환
        return newAccessToken;
      } else {
        // 토큰 갱신 실패: 에러 throw
        throw new Error(response.data.message || '토큰 갱신에 실패했습니다.');
      }
    } catch (error) {
      // Refresh Token도 만료된 경우 로그아웃 처리
      console.error('=== /api/refresh 요청 실패 ===');
      console.error('에러 상태 코드:', error.response?.status);
      console.error('에러 메시지:', error.response?.data);
      console.error('에러 헤더:', error.response?.headers);
      console.error('전체 에러:', error);

      // 상태 초기화
      setUser(null);
      setAccessToken(null);

      // localStorage 정리
      localStorage.removeItem('user');

      // 에러를 throw하여 호출한 쪽에서 처리할 수 있도록 함
      throw error;
    }
  };

  // Context에 제공할 값
  // 하위 컴포넌트들은 이 값들을 useAuth() 훅을 통해 사용할 수 있습니다.
  const value = {
    user,                // 현재 로그인한 사용자 정보
    accessToken,         // 현재 accessToken
    isLoading,           // 로딩 상태
    login,               // 로그인 함수
    logout,              // 로그아웃 함수
    updateToken,         // 토큰 갱신 함수
    refreshAccessToken,  // Refresh Token으로 Access Token 갱신 함수
    isAuthenticated: !!user  // 로그인 여부 (user가 있으면 true)
  };

  /**
   * AuthContext.Provider를 사용하여 인증 정보를 하위 컴포넌트에 제공
   *
   * Context API의 동작 원리:
   * 1. Provider 컴포넌트가 value prop을 통해 데이터를 제공
   * 2. 하위 컴포넌트에서 useAuth() 훅을 사용하여 이 데이터에 접근
   * 3. value가 변경되면 이를 사용하는 모든 컴포넌트가 자동으로 리렌더링
   *
   * 예시:
   * - App.jsx에서 <AuthProvider>로 전체 앱을 감쌈
   * - Login.jsx에서 useAuth()를 호출하면 여기서 제공하는 value를 받음
   * - login() 함수를 호출하면 user, accessToken 상태가 변경됨
   * - 이 변경사항이 자동으로 Gnb.jsx 등 모든 하위 컴포넌트에 반영됨
   *
   * {children}:
   * - AuthProvider로 감싼 모든 하위 컴포넌트를 의미
   * - App.jsx에서는 <BrowserRouter>, <Routes> 등이 children에 해당
   * - 이 children들이 모두 인증 정보에 접근할 수 있게 됨
   */
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
