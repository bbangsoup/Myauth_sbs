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
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Signup;
