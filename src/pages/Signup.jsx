import { Link } from 'react-router-dom';
import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import SignupFormCard from '../components/SignupFormCard';
import './Signup.css';

function Signup() {
  return (
    <>
      <GNB />
      <main className="signup-page">
        <div className="signup-page-panel">
          <SignupFormCard />
          <div className="signup-page-bottom">
            <Link to="/" className="signup-page-back-button">
              {'\uD648\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30'}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Signup;
