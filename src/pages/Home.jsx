import { useEffect, useState } from 'react';

import GNB from '../components/Gnb';
import LoginFormCard from '../components/LoginFormCard';
import SignupFormCard from '../components/SignupFormCard';
import '../components/AuthModal.css';
import './Home.css';

const LABELS = {
  stackTitle: '\uAE30\uC220 \uC2A4\uD0DD',
  login: '\uB85C\uADF8\uC778',
  signup: '\uD68C\uC6D0\uAC00\uC785',
  close: '\uB2EB\uAE30',
  stackDescription: '\uD504\uB860\uD2B8\uC5D4\uB4DC\uC640 \uBC31\uC5D4\uB4DC\uC5D0\uC11C \uC0AC\uC6A9\uB41C \uAE30\uC220\uC744 \uC815\uB9AC\uD588\uC2B5\uB2C8\uB2E4.',
  loginDescription: '\uD604\uC7AC \uB85C\uADF8\uC778 \uAE30\uB2A5\uC744 \uADF8\uB300\uB85C \uC0AC\uC6A9\uD558\uBA74\uC11C \uD648\uC5D0\uC11C \uBC14\uB85C \uC9C4\uC785\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  signupDescription: '\uD604\uC7AC \uD68C\uC6D0\uAC00\uC785 \uD750\uB984\uC744 \uBAA8\uB2EC\uB85C \uB744\uC6CC \uD558\uB2E8 \uAD6C\uC131\uC774 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC774\uC5B4\uC9D1\uB2C8\uB2E4.',
  loginCta: '\uB85C\uADF8\uC778 \uD558\uAE30',
  signupCta: '\uD68C\uC6D0\uAC00\uC785 \uD558\uAE30',
  loginEyebrow: '\uC811\uC18D \uC548\uB0B4',
  loginModalTitle: '\uB77C\uC6B4\uC9C0\uC5D0 \uC785\uC7A5\uD558\uAE30',
  loginModalDescription: '\uB85C\uADF8\uC778\uD558\uBA74 \uAC8C\uC2DC\uAE00, \uC54C\uB9BC\uAE00, DM \uAE30\uB2A5\uC744 \uBC14\uB85C \uC774\uC5B4\uC11C \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  signupEyebrow: '\uC2E0\uADDC \uBA64\uBC84',
  signupModalTitle: '\uB098\uB9CC\uC758 \uACF5\uAC04 \uC2DC\uC791\uD558\uAE30',
  signupModalDescription: '\uAC00\uC785\uC774 \uB05D\uB098\uBA74 \uD504\uB85C\uD544, \uCEE4\uBBA4\uB2C8\uD2F0 \uAE00\uC4F0\uAE30, \uBA54\uC2DC\uC9C0 \uAE30\uB2A5\uAE4C\uC9C0 \uBC14\uB85C \uC5F4\uB9BD\uB2C8\uB2E4.',
};

const TECH_STACK = [
  'React',
  'Vite',
  'React Router',
  'Axios',
  'Java',
  'Spring Boot',
  'MySQL',
  'Docker',
  'Git',
  'GitHub',
];

function Home() {
  const [authModal, setAuthModal] = useState(null);

  useEffect(() => {
    if (!authModal) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [authModal]);

  const closeModal = () => setAuthModal(null);

  return (
    <>
      <GNB />
      <main className="portfolio-home">
        <section className="portfolio-panel portfolio-panel-top">
          <div className="portfolio-panel-glow" />
          <div className="portfolio-name-card">
            <div className="portfolio-name-copy">
              <h1>KIM HA YUL</h1>
            </div>

            <div className="portfolio-stack-reveal">
              <div className="portfolio-stack-copy">
                <strong>{LABELS.stackTitle}</strong>
                <p>{LABELS.stackDescription}</p>
              </div>
              <div className="portfolio-stack-grid">
                {TECH_STACK.map((stack) => (
                  <span key={stack}>{stack}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="portfolio-split-grid">
          <button
            type="button"
            className="portfolio-panel portfolio-panel-bottom portfolio-panel-login"
            onClick={() => setAuthModal('login')}
          >
            <div className="portfolio-panel-content">
              <h2>{LABELS.login}</h2>
              <p>{LABELS.loginDescription}</p>
              <span className="portfolio-panel-cta">{LABELS.loginCta}</span>
            </div>
          </button>

          <button
            type="button"
            className="portfolio-panel portfolio-panel-bottom portfolio-panel-signup"
            onClick={() => setAuthModal('signup')}
          >
            <div className="portfolio-panel-content">
              <h2>{LABELS.signup}</h2>
              <p>{LABELS.signupDescription}</p>
              <span className="portfolio-panel-cta">{LABELS.signupCta}</span>
            </div>
          </button>
        </section>
      </main>

      {authModal && (
        <div className="auth-modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className={`auth-modal-shell ${authModal === 'signup' ? 'signup' : ''}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="auth-modal-close" onClick={closeModal} aria-label={LABELS.close}>
              &times;
            </button>

            {authModal === 'login' ? (
              <>
                <div className="auth-modal-form">
                  <LoginFormCard
                    onSwitchMode={() => setAuthModal('signup')}
                    onSuccess={() => {
                      closeModal();
                      window.location.href = '/posts';
                    }}
                  />
                </div>
                <div className="auth-modal-visual">
                  <div className="auth-modal-visual-inner">
                    <span className="auth-modal-eyebrow">{LABELS.loginEyebrow}</span>
                    <h2>{LABELS.loginModalTitle}</h2>
                    <p>{LABELS.loginModalDescription}</p>
                    <div className="auth-modal-stack">
                      <span>{'\uAC8C\uC2DC\uAE00'}</span>
                      <span>{'\uC54C\uB9BC\uAE00'}</span>
                      <span>DM</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="auth-modal-visual">
                  <div className="auth-modal-visual-inner">
                    <span className="auth-modal-eyebrow">{LABELS.signupEyebrow}</span>
                    <h2>{LABELS.signupModalTitle}</h2>
                    <p>{LABELS.signupModalDescription}</p>
                    <div className="auth-modal-stack">
                      <span>{'\uD504\uB85C\uD544'}</span>
                      <span>{'\uCEE4\uBBA4\uB2C8\uD2F0'}</span>
                      <span>{'\uD3EC\uD2B8\uD3F4\uB9AC\uC624'}</span>
                    </div>
                  </div>
                </div>
                <div className="auth-modal-form">
                  <SignupFormCard
                    onSwitchMode={() => setAuthModal('login')}
                    onSuccess={() => {
                      closeModal();
                      window.location.href = '/';
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Home;
