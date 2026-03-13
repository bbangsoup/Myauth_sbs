import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import GNB from '../components/Gnb';
import { useAuth } from '../hooks/useAuth';
import './Home.css';

function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  const handleAuthRequiredNav = (e, path) => {
    e.preventDefault();
    const hasSavedUser = Boolean(window.localStorage.getItem('user'));
    if (!isAuthenticated && !isLoading && !hasSavedUser) {
      alert('로그인 후, 이용할 수 있습니다.');
      return;
    }
    window.location.href = path;
  };

  return (
    <>
      <GNB />
      <main className="home-container">
        <section className="home-hero">
          <h1>My Work</h1>
          <p>게시글과 알림글을 확인해보세요.</p>
          <div className="home-action-row">
            <Link to="/posts" className="home-action-button" onClick={(e) => handleAuthRequiredNav(e, '/posts')}>
              게시글
            </Link>
            <Link to="/notices" className="home-action-button secondary" onClick={(e) => handleAuthRequiredNav(e, '/notices')}>
              알림글
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default Home;




