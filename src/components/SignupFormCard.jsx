import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import './AuthCard.css';

const TEXT = {
  emailRequired: '\uC774\uBA54\uC77C\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.',
  emailInvalid: '\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4.',
  passwordRequired: '\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.',
  passwordLength: '\uBE44\uBC00\uBC88\uD638\uB294 \uCD5C\uC18C 8\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.',
  confirmRequired: '\uBE44\uBC00\uBC88\uD638 \uD655\uC778\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.',
  confirmMismatch: '\uBE44\uBC00\uBC88\uD638\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
  usernameRequired: '\uC774\uB984\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.',
  signupSuccess: '\uD68C\uC6D0\uAC00\uC785\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  signupFailed: '\uD68C\uC6D0\uAC00\uC785\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
  signupError: '\uD68C\uC6D0\uAC00\uC785 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
  passwordPlaceholder: '\uCD5C\uC18C 8\uC790 \uC774\uC0C1 \uC785\uB825\uD558\uC138\uC694',
  confirmPlaceholder: '\uBE44\uBC00\uBC88\uD638\uB97C \uD55C \uBC88 \uB354 \uC785\uB825\uD558\uC138\uC694',
  usernamePlaceholder: '\uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694',
  loading: '\uCC98\uB9AC \uC911...',
  signup: '\uD68C\uC6D0\uAC00\uC785',
  hasAccount: '\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uC73C\uC2E0\uAC00\uC694?',
  login: '\uB85C\uADF8\uC778',
  createAccount: '\uD68C\uC6D0\uAC00\uC785',
  joinSpace: '\uC0C8\uB85C \uC2DC\uC791\uD574\uBCF4\uC138\uC694',
  subtitle: '\uAE30\uC874 \uD68C\uC6D0\uAC00\uC785 \uD750\uB984\uC744 \uADF8\uB300\uB85C \uC0AC\uC6A9\uD558\uBA74\uC11C \uD648 \uD654\uBA74\uC5D0\uC11C \uBC14\uB85C \uAC00\uC785\uD560 \uC218 \uC788\uAC8C \uAD6C\uC131\uD588\uC2B5\uB2C8\uB2E4.',
  emailLabel: 'Email',
  passwordLabel: '\uBE44\uBC00\uBC88\uD638',
  confirmLabel: '\uBE44\uBC00\uBC88\uD638 \uD655\uC778',
  usernameLabel: '\uC774\uB984',
};

function SignupFormCard({ onSwitchMode, onSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
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
      newErrors.email = TEXT.emailRequired;
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = TEXT.emailInvalid;
    }

    if (!formData.password) {
      newErrors.password = TEXT.passwordRequired;
    } else if (formData.password.length < 8) {
      newErrors.password = TEXT.passwordLength;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = TEXT.confirmRequired;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = TEXT.confirmMismatch;
    }

    if (!formData.username) {
      newErrors.username = TEXT.usernameRequired;
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
      const response = await axios.post('/api/signup', {
        email: formData.email,
        password: formData.password,
        username: formData.username,
      });

      if (response.data.success) {
        alert(response.data.message || TEXT.signupSuccess);
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/');
        }
      } else {
        alert(response.data.message || TEXT.signupFailed);
      }
    } catch (error) {
      console.error('signup error:', error);
      alert(TEXT.signupError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <span className="auth-card-kicker">{TEXT.createAccount}</span>
        <h2 className="auth-card-title">{TEXT.joinSpace}</h2>
        <p className="auth-card-subtitle">{TEXT.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-card-form">
        <div className="auth-card-field">
          <label htmlFor="signup-email">{TEXT.emailLabel}</label>
          <input
            id="signup-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={errors.email ? 'auth-error' : ''}
          />
          {errors.email && <span className="auth-card-error">{errors.email}</span>}
        </div>

        <div className="auth-card-field">
          <label htmlFor="signup-password">{TEXT.passwordLabel}</label>
          <input
            id="signup-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={TEXT.passwordPlaceholder}
            className={errors.password ? 'auth-error' : ''}
          />
          {errors.password && <span className="auth-card-error">{errors.password}</span>}
        </div>

        <div className="auth-card-field">
          <label htmlFor="signup-confirm-password">{TEXT.confirmLabel}</label>
          <input
            id="signup-confirm-password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder={TEXT.confirmPlaceholder}
            className={errors.confirmPassword ? 'auth-error' : ''}
          />
          {errors.confirmPassword && <span className="auth-card-error">{errors.confirmPassword}</span>}
        </div>

        <div className="auth-card-field">
          <label htmlFor="signup-username">{TEXT.usernameLabel}</label>
          <input
            id="signup-username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder={TEXT.usernamePlaceholder}
            className={errors.username ? 'auth-error' : ''}
          />
          {errors.username && <span className="auth-card-error">{errors.username}</span>}
        </div>

        <div className="auth-card-actions">
          <button type="submit" className="auth-card-primary" disabled={isLoading}>
            {isLoading ? TEXT.loading : TEXT.signup}
          </button>
        </div>
      </form>

      <div className="auth-card-switch">
        {TEXT.hasAccount}{' '}
        {onSwitchMode ? (
          <button type="button" className="auth-card-switch-button" onClick={onSwitchMode}>
            {TEXT.login}
          </button>
        ) : (
          <Link to="/login">{TEXT.login}</Link>
        )}
      </div>
    </div>
  );
}

export default SignupFormCard;
