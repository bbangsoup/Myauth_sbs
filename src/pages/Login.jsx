import { Link } from 'react-router-dom';
import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import LoginFormCard from '../components/LoginFormCard';
import './Login.css';

function Login() {
  return (
    <>
      <GNB />
      <main className="auth-page">
        <div className="auth-page-panel">
          <LoginFormCard />
          <div className="auth-page-bottom">
            <Link to="/" className="auth-page-back-button">
              {'\uD648\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30'}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Login;
