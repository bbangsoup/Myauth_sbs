import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import GNB from "../components/Gnb";
import Footer from "../components/Footer"
import { useAuth } from '../hooks/useAuth'
import './Login.css'

function Login() {

  const navigate = useNavigate();
  // AuthContext에서 login 함수 가져오기
  const { login } = useAuth();

  // 폼 데이터를 관리하는 상태입니다.
  // 로그인에 필요한 필드의 값을 저장합니다.
  const [formData, setFormData] = useState({
    email: '',    // 사용자 이메일 주소
    password: ''  // 사용자 비밀번호
  })

  // 폼 유효성 검사 에러 메시지를 저장하는 상태입니다.
  // 각 필드별로 에러 메시지를 객체(오브젝트) 형태로 저장합니다.
  const [errors, setErrors] = useState({})

  // API 요청 중인지 여부를 나타내는 로딩 상태입니다.
  const [isLoading, setIsLoading] = useState(false)

  /**
   * isValidEmail 함수
   *
   * 이메일 주소가 유효한 형식인지 검사하는 함수입니다.
   *
   * @param {string} email - 검사할 이메일 주소
   * @returns {boolean} - 유효한 이메일 형식이면 true, 아니면 false
   *
   * 검증 로직:
   * 1. @ 기호가 있는지 확인
   * 2. @ 기호가 첫 번째 문자가 아닌지 확인 (앞에 사용자명이 있어야 함)
   * 3. 마지막 . 기호가 @ 기호 뒤에 있는지 확인 (도메인이 있어야 함)
   * 4. 마지막 . 기호가 이메일의 마지막 문자가 아닌지 확인 (최상위 도메인이 있어야 함)
   */
  const isValidEmail = (email) => {
    // @ 기호의 위치 찾기
    const atIndex = email.indexOf('@');
    // 마지막 . 기호의 위치 찾기
    const dotIndex = email.lastIndexOf('.');

    // 유효성 검사: @ 기호가 있고, @ 뒤에 .이 있고, .이 마지막이 아니어야 함
    return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
  };

  /**
   * validateForm 함수
   *
   * 폼의 유효성을 검사하는 함수입니다.
   *
   * @returns {boolean} - 모든 검증을 통과하면 true, 그렇지 않으면 false
   *
   * 검증 규칙:
   * 1. 이메일: 필수 입력, 올바른 이메일 형식
   * 2. 비밀번호: 필수 입력
   */
  const validateForm = () => {
    const newErrors = {}

    // 이메일 검증
    // 1단계: 이메일이 입력되었는지 확인
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.'
    }
    // 2단계: 이메일 형식이 올바른지 확인 (isValidEmail 함수 사용)
    else if (!isValidEmail(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.'
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * handleSubmit 함수
   *
   * 로그인 폼을 제출할 때 호출되는 함수입니다.
   *
   * @param {Event} e - 폼 제출 이벤트 객체
   *
   * 처리 과정:
   * 1. 폼 기본 제출 동작 방지
   * 2. 유효성 검사 실행
   * 3. 검사 통과 시 서버에 로그인 요청
   * 4. 성공 시 AuthContext에 사용자 정보 저장 후 홈 페이지로 이동
   * 5. 실패 시 에러 메시지 표시
   */
  const handleSubmit = async (e) => {
    // 폼의 기본 제출 동작 방지 (페이지 새로고침 방지)
    e.preventDefault();

    // 폼 유효성 검사 실행
    if (!validateForm()) {
      return; // 검증 실패 시 함수 종료
    }

    // 로딩 상태 시작
    setIsLoading(true);

    try {
      // axios를 사용하여 서버에 POST 요청 전송
      // '/api/loginEx' 요청 → proxy를 통해 'http://localhost:9080/loginEx'으로 전달됨
      // withCredentials: true 옵션으로 쿠키(refreshToken)를 받을 수 있도록 설정
      const response = await axios.post('/api/loginEx', {
        email: formData.email,
        password: formData.password
      }, {
        withCredentials: true  // HTTP-only 쿠키를 받기 위해 필요
      });

      // 서버 응답 확인
      if (response.data.success) {
        // 로그인 성공: AuthContext에 사용자 정보와 accessToken 저장
        // response.data.data 구조: { accessToken, refreshToken, user: { id, email, name, role } }
        login(response.data.data.user, response.data.data.accessToken);

        // 로그인 성공 메시지 표시
        alert(response.data.message);

        // 홈 페이지로 이동
        navigate('/');
      } else {
        // 로그인 실패: 에러 메시지 표시 (예: 이메일 또는 비밀번호 불일치)
        alert(response.data.message);
      }
    } catch (error) {
      // 네트워크 에러 또는 서버 에러 처리
      console.error('로그인 에러:', error);
      alert('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      // 로딩 상태 종료 (성공/실패 관계없이 실행)
      setIsLoading(false);
    }
  }

  /**
   * handleChange 함수
   *
   * 입력 필드의 값이 변경될 때 호출되는 이벤트 핸들러입니다.
   *
   * @param {Event} e - 입력 필드의 변경 이벤트 객체
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 해당 필드에 에러가 있다면 에러를 초기화합니다.
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }

  /**
   * handleKakaoLogin 함수
   *
   * 카카오 로그인 버튼 클릭 시 호출되는 함수입니다.
   *
   * 📌 프론트엔드 관점의 카카오 로그인 플로우 (1단계):
   *
   * [1단계] 사용자가 "카카오 로그인" 버튼 클릭
   *   ↓
   * [2단계] 이 함수가 실행되어 백엔드의 /auth/kakao/login으로 전체 페이지 리다이렉트
   *   - redirectUrl 파라미터로 프론트엔드 콜백 URL 전달 (http://localhost:5173/oauth/callback)
   *   - 백엔드는 이 URL을 세션에 저장 (카카오 OAuth 플로우 완료 후 사용)
   *   - Vite proxy가 '/api/auth/kakao/login' → 'http://localhost:9080/auth/kakao/login'으로 전달
   *   - 브라우저 주소창이 백엔드 URL로 변경됨
   *   ↓
   * [3단계] 백엔드가 카카오 인증 서버로 다시 리다이렉트
   *   - 브라우저 주소창이 'https://kauth.kakao.com/...'으로 변경됨
   *   - 사용자는 카카오 로그인 페이지를 보게 됨
   *   ↓
   * [4단계] 사용자가 카카오 계정으로 로그인 & 동의
   *   ↓
   * [5단계] 카카오가 백엔드의 /auth/kakao/callback으로 리다이렉트 (Authorization Code 포함)
   *   - 이 부분은 백엔드에서 처리 (프론트엔드는 관여하지 않음)
   *   ↓
   * [6단계] 백엔드가 처리 완료 후 세션에 저장된 redirectUrl로 프론트엔드 리다이렉트
   *   - 성공: http://localhost:5173/oauth/callback?status=success
   *   - 실패: http://localhost:5173/oauth/callback?error=에러메시지
   *   ↓
   * [7단계] OAuthCallback 컴포넌트가 실행됨 (2단계 처리 시작)
   *
   * 참고:
   * - window.location.href는 전체 페이지 리다이렉트를 수행 (SPA가 아닌 전통적인 페이지 이동)
   * - 이 과정에서 React 상태는 모두 초기화됨
   * - Vite의 proxy 설정 덕분에 '/api'로 시작하는 요청이 백엔드로 전달됨
   * - redirectUrl은 URL 인코딩하여 쿼리 파라미터로 전달
   */
  const handleKakaoLogin = () => {
    // 카카오 OAuth 플로우 완료 후 돌아올 프론트엔드 콜백 URL
    const callbackUrl = `${window.location.origin}/oauth/callback`;

    // URL 인코딩하여 쿼리 파라미터로 전달
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);

    // 백엔드의 카카오 로그인 시작 엔드포인트로 전체 페이지 리다이렉트
    // - redirectUrl 파라미터: 백엔드가 OAuth 플로우 완료 후 리다이렉트할 프론트엔드 URL
    // - 백엔드는 이 URL을 세션에 저장했다가 카카오 콜백 처리 후 사용
    // - 브라우저가 http://localhost:9080/auth/kakao/login?redirectUrl=... 으로 이동
    // - 백엔드는 이 요청을 받아 카카오 인증 서버로 다시 리다이렉트
    // - 현재 페이지(Login.jsx)는 언마운트되고 모든 상태가 사라짐
    window.location.href = `/api/auth/kakao/login?redirectUrl=${encodedCallbackUrl}`;
  }

  return (
    <>
      <GNB />
        <div className="login-container">
          <div className='login-card'>
            <h1>로그인</h1>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <input type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="이메일을 입력하세요"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              <div className="form-group">
                <input type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="비밀번호를 입력하세요"
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>
              <div className="button-group">
                <button type="submit" className="login-button" disabled={isLoading}>
                  {isLoading ? '처리 중...' : '로그인'}
                </button>
              </div>

              {/* 소셜 로그인 구분선 */}
              <div className="divider">
                <span>또는</span>
              </div>

              {/* 카카오 로그인 버튼 */}
              <div className="social-login-group">
                <button
                  type="button"
                  className="kakao-login-button"
                  onClick={handleKakaoLogin}
                  disabled={isLoading}
                >
                  <svg className="kakao-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 0C4.029 0 0 3.285 0 7.333c0 2.55 1.65 4.794 4.14 6.075l-1.05 3.87c-.09.33.24.6.54.45l4.56-3.03c.27.03.54.045.81.045 4.971 0 9-3.285 9-7.333C18 3.285 13.971 0 9 0z" fill="currentColor"/>
                  </svg>
                  카카오 로그인
                </button>
              </div>

              <div className="signup-link">
                <p>계정이 없으신가요? <Link to="/signup">회원가입</Link></p>
              </div>
            </form>
          </div>
        </div>
      <Footer />
    </>
  );

}

export default Login;
