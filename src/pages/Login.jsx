import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (email) => {
    const atIndex = email.indexOf('@');
    const dotIndex = email.lastIndexOf('.');
    return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await axios.post(
        '/api/login',
        {
          email: formData.email,
          password: formData.password,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        login(response.data.data.user, response.data.data.accessToken);
        alert(response.data.message);
        navigate('/');
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error('로그인 에러:', error);
      alert('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleKakaoLogin = () => {
    const callbackUrl = `${window.location.origin}/oauth/callback`;
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    window.location.href = `/api/auth/kakao/login?redirectUrl=${encodedCallbackUrl}`;
  };

  return (
    <>
      <GNB />
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">로그인</h1>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="이메일을 입력하세요"
                autoComplete="email"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="button-group">
              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? '처리 중...' : '로그인'}
              </button>
            </div>

            <div className="divider">
              <span>또는</span>
            </div>

            <div className="social-login-group">
              <button
                type="button"
                className="kakao-login-button"
                onClick={handleKakaoLogin}
                disabled={isLoading}
              >
                <svg className="kakao-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M9 0C4.029 0 0 3.285 0 7.333c0 2.55 1.65 4.794 4.14 6.075l-1.05 3.87c-.09.33.24.6.54.45l4.56-3.03c.27.03.54.045.81.045 4.971 0 9-3.285 9-7.333C18 3.285 13.971 0 9 0z"
                    fill="currentColor"
                  />
                </svg>
                카카오 로그인
              </button>
            </div>

            <div className="signup-link">
              <p>
                계정이 없으신가요? <Link to="/signup">회원가입</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Login;
