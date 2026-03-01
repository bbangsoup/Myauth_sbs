import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Gnb.css';
import defaultUserImage from '../assets/default_user.png';

function GNB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      try {
        await logout();
        alert('로그아웃되었습니다.');
        navigate('/');
      } catch (error) {
        console.error('로그아웃 처리 중 오류:', error);
        navigate('/');
      }
    }
  };

  return (
    <nav className="gnb">
      <div className="gnb-container">
        <div className="gnb-left">
          <Link to="/" className={`gnb-link ${location.pathname === '/' ? 'active' : ''}`}>
            <span className="gnb-icon" aria-hidden="true">{'\u{1F3E0}'}</span>
            <span className="gnb-label">HOME</span>
          </Link>

          <Link to="/posts" className={`gnb-link ${location.pathname.startsWith('/posts') ? 'active' : ''}`}>
            <span className="gnb-icon" aria-hidden="true">{'\u{1F4DD}'}</span>
            <span className="gnb-label">게시글</span>
          </Link>
        </div>

        <div className="gnb-right">
          {isLoading ? (
            <span className="gnb-loading">로딩 중...</span>
          ) : isAuthenticated ? (
            <>
              <Link to="/profile" className="gnb-user-info">
                <img
                  src={user?.profileImage || defaultUserImage}
                  alt="프로필"
                  className="gnb-user-avatar"
                />
                <span className="gnb-icon" aria-hidden="true">{'\u{1F464}'}</span>
                <span className="gnb-label">{user?.name}님</span>
              </Link>

              <button onClick={handleLogout} className="auth-link logout-button" type="button">
                <span className="gnb-icon" aria-hidden="true">{'\u{1F6AA}'}</span>
                <span className="gnb-label">로그아웃</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="auth-link">
                <span className="gnb-icon" aria-hidden="true">{'\u{1F510}'}</span>
                <span className="gnb-label">로그인</span>
              </Link>

              <Link to="/signup" className="auth-link signup">
                <span className="gnb-icon" aria-hidden="true">{'\u2728'}</span>
                <span className="gnb-label">회원가입</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default GNB;
