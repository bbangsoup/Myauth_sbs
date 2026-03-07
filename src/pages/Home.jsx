import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import GNB from "../components/Gnb";
import { useAuth } from "../hooks/useAuth";
import "./Home.css";

function Home() {
  const { isAuthenticated } = useAuth();

  const handleAuthRequiredNav = (e) => {
    if (isAuthenticated) return;
    e.preventDefault();
    alert("로그인 후, 이용할 수 있습니다.");
  };

  return (
    <>
      <GNB />
      <main className="home-container">
        <section className="home-hero">
          <h1>My Work</h1>
          <p>게시글과 알림글을 확인해보세요.</p>
          <div className="home-action-row">
            <Link to="/posts" className="home-action-button" onClick={handleAuthRequiredNav}>게시글</Link>
            <Link to="/notices" className="home-action-button secondary" onClick={handleAuthRequiredNav}>알림글</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>    
  );
}

export default Home;
