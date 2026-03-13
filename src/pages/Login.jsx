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
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Login;
