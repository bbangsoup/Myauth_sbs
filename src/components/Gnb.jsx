import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Gnb.css';
// 기본 사용자 프로필 이미지 (로그인 시 표시)
import defaultUserImage from '../assets/default_user.png';

function GNB() {
  const navigate = useNavigate();
  // AuthContext에서 인증 정보 가져오기
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // 디버깅: GNB 렌더링 시 상태 확인
  console.log('==== GNB 렌더링 ====');
  console.log('isLoading:', isLoading);
  console.log('isAuthenticated:', isAuthenticated);
  console.log('user:', user);

  /**
   * handleLogout 함수
   *
   * 로그아웃 버튼 클릭 시 호출되는 함수입니다.
   * AuthContext의 logout 함수를 호출하여 로그인 정보를 삭제하고 홈으로 이동합니다.
   *
   * 처리 과정:
   * 1. 사용자 확인 (confirm 다이얼로그)
   * 2. 서버에 로그아웃 요청 (/api/logout)
   * 3. 클라이언트 상태 정리 (user, accessToken, localStorage)
   * 4. 홈 페이지로 이동
   */
  const handleLogout = async () => {
    // 로그아웃 확인
    if (window.confirm('로그아웃 하시겠습니까?')) {
      try {
        // AuthContext의 logout 함수 호출
        // - 서버에 /api/logout 요청 (HTTP-only 쿠키의 refreshToken 삭제)
        // - 클라이언트 상태 정리 (user, accessToken, localStorage)
        await logout();

        // 로그아웃 성공 메시지
        alert('로그아웃되었습니다.');

        // 홈 페이지로 이동
        navigate('/');
      } catch (error) {
        // 에러가 발생해도 logout 함수 내부에서 클라이언트 상태는 정리됨
        console.error('로그아웃 처리 중 에러:', error);

        // 홈 페이지로 이동
        navigate('/');
      }
    }
  };

  return (
    <>
      <nav className="gnb">
        <div className="gnb-container">
          {/* 왼쪽 영역: 네비게이션 링크 */}
          <div className="gnb-left">
            <Link to="/" className={`gnb-link ${location.pathname === '/' ? 'active' : ''}`}>
              HOME
            </Link>
            <Link to="/posts" className={`gnb-link ${location.pathname.startsWith('/posts') ? 'active' : ''}`}>
              게시글
            </Link>
          </div>

          {/* 오른쪽 영역: 로그인 상태에 따라 다른 UI 표시 */}
          <div className="gnb-right">
            {isLoading ? (
              // 로딩 중: 인증 상태 확인 중
              <span className="gnb-loading">로딩 중...</span>
            ) : isAuthenticated ? (
              // 로그인된 상태: 사용자 프로필 이미지, 이름, 로그아웃 버튼 표시
              <>
                {/* 사용자 정보 클릭 시 프로필 페이지로 이동 */}
                <Link to="/profile" className="gnb-user-info">
                  {/* 사용자 프로필 이미지 (카카오 프로필 또는 기본 이미지) */}
                  <img
                    src={user?.profileImage || defaultUserImage}
                    alt="프로필"
                    className="gnb-user-avatar"
                  />
                  {user?.name}님
                </Link>
                <button onClick={handleLogout} className="auth-link logout-button">
                  로그아웃
                </button>
              </>
            ) : (
              // 로그인되지 않은 상태: 로그인/회원가입 버튼 표시
              <>
                <Link to="/login" className="auth-link">
                  로그인
                </Link>
                <Link to="/signup" className="auth-link signup">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

export default GNB;