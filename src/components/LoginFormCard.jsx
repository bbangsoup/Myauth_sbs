import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

import { useAuth } from '../hooks/useAuth';
import './AuthCard.css';

const TEXT = {
  emailRequired: '\uC774\uBA54\uC77C\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.',
  emailInvalid: '\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4.',
  passwordRequired: '\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.',
  loginSuccess: '\uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  loginFailed: '\uB85C\uADF8\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
  loginError: '\uB85C\uADF8\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
  passwordPlaceholder: '\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694',
  loading: '\uCC98\uB9AC \uC911...',
  login: '\uB85C\uADF8\uC778',
  or: '\uB610\uB294',
  kakao: '\uCE74\uCE74\uC624 \uB85C\uADF8\uC778',
  noAccount: '\uACC4\uC815\uC774 \uC5C6\uC73C\uC2E0\uAC00\uC694?',
  signup: '\uD68C\uC6D0\uAC00\uC785',
  signIn: '\uB85C\uADF8\uC778',
  welcomeBack: '\uB2E4\uC2DC \uBC18\uAC11\uC2B5\uB2C8\uB2E4',
  subtitle: '\uAE30\uC874 \uB85C\uADF8\uC778 \uD750\uB984\uC744 \uADF8\uB300\uB85C \uC0AC\uC6A9\uD558\uBA74\uC11C \uAC8C\uC2DC\uAE00, \uC54C\uB9BC\uAE00, DM\uC73C\uB85C \uC774\uC5B4\uC9D1\uB2C8\uB2E4.',
  emailLabel: 'Email',
  passwordLabel: '\uBE44\uBC00\uBC88\uD638',
};

function LoginFormCard({ onSwitchMode, onSuccess }) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const getRedirectPath = (userData) => (
    userData?.role === 'ROLE_ADMIN' || userData?.isSuperUser ? '/admin' : '/posts'
  );

  const isValidEmail = (email) => {
    const atIndex = email.indexOf('@');
    const dotIndex = email.lastIndexOf('.');
    return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = TEXT.emailRequired;
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = TEXT.emailInvalid;
    }

    if (!formData.password) {
      newErrors.password = TEXT.passwordRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        { withCredentials: true }
      );

      if (response.data.success) {
        const loggedInUser = response.data.data.user;
        login(loggedInUser, response.data.data.accessToken);
        alert(response.data.message || TEXT.loginSuccess);
        if (onSuccess) {
          onSuccess(loggedInUser);
        } else {
          window.location.href = getRedirectPath(loggedInUser);
        }
      } else {
        alert(response.data.message || TEXT.loginFailed);
      }
    } catch (error) {
      console.error('login error:', error);
      alert(TEXT.loginError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    const callbackUrl = `${window.location.origin}/oauth/callback`;
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    window.location.href = `/api/auth/kakao/login?redirectUrl=${encodedCallbackUrl}`;
  };

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <span className="auth-card-kicker">{TEXT.signIn}</span>
        <h2 className="auth-card-title">{TEXT.welcomeBack}</h2>
        <p className="auth-card-subtitle">{TEXT.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-card-form">
        <div className="auth-card-field">
          <label htmlFor="login-email">{TEXT.emailLabel}</label>
          <input
            id="login-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            className={errors.email ? 'auth-error' : ''}
          />
          {errors.email && <span className="auth-card-error">{errors.email}</span>}
        </div>

        <div className="auth-card-field">
          <label htmlFor="login-password">{TEXT.passwordLabel}</label>
          <input
            id="login-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={TEXT.passwordPlaceholder}
            autoComplete="current-password"
            className={errors.password ? 'auth-error' : ''}
          />
          {errors.password && <span className="auth-card-error">{errors.password}</span>}
        </div>

        <div className="auth-card-actions">
          <button type="submit" className="auth-card-primary" disabled={isLoading}>
            {isLoading ? TEXT.loading : TEXT.login}
          </button>
        </div>

        <div className="auth-card-divider">
          <span>{TEXT.or}</span>
        </div>

        <button
          type="button"
          className="auth-card-secondary"
          onClick={handleKakaoLogin}
          disabled={isLoading}
        >
          <svg className="auth-card-kakao-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 0C4.029 0 0 3.285 0 7.333c0 2.55 1.65 4.794 4.14 6.075l-1.05 3.87c-.09.33.24.6.54.45l4.56-3.03c.27.03.54.045.81.045 4.971 0 9-3.285 9-7.333C18 3.285 13.971 0 9 0z"
              fill="currentColor"
            />
          </svg>
          {TEXT.kakao}
        </button>
      </form>

      <div className="auth-card-switch">
        {TEXT.noAccount}{' '}
        {onSwitchMode ? (
          <button type="button" className="auth-card-switch-button" onClick={onSwitchMode}>
            {TEXT.signup}
          </button>
        ) : (
          <Link to="/signup">{TEXT.signup}</Link>
        )}
      </div>
    </div>
  );
}

export default LoginFormCard;
