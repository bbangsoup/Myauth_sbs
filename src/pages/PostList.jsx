import { useState } from 'react';
import { Link } from 'react-router-dom';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import { useAuth } from '../hooks/useAuth';
import { usePosts } from '../hooks/usePosts';
import { isAdminUser } from '../utils/auth';
import './PostList.css';

function PostList({ mode = 'posts' }) {
  const { user, isAuthenticated, accessToken } = useAuth();
  const isNoticeMode = mode === 'notices';
  const canWriteNotice = isAdminUser(user);
  const canCreate = isNoticeMode ? canWriteNotice : isAuthenticated;
  const createPath = isNoticeMode ? '/notices/create' : '/posts/create';
  const detailPathPrefix = isNoticeMode ? '/notices' : '/posts';
  const pageTitle = isNoticeMode ? '알림글' : '게시글';

  const [activeTab, setActiveTab] = useState('all');

  const { posts, isLoading, error, fetchPosts } = usePosts(accessToken, {
    myPostsOnly: !isNoticeMode && activeTab === 'mine',
    noticesOnly: isNoticeMode,
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <>
      <GNB />
      <div className="post-list-container">
        <div className="post-list-header">
          <div className="post-list-title-wrap">
            <h1>{pageTitle}</h1>
          </div>
          {canCreate && (
            <Link to={createPath} className="post-create-button">
              + 새 글 작성
            </Link>
          )}
        </div>

        {!isNoticeMode && isAuthenticated && (
          <div className="post-tabs">
            <button
              className={`post-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => handleTabChange('all')}
            >
              전체 피드
            </button>
            <button
              className={`post-tab ${activeTab === 'mine' ? 'active' : ''}`}
              onClick={() => handleTabChange('mine')}
            >
              내 게시글
            </button>
          </div>
        )}

        <div className="post-list">
          {isLoading ? (
            <div className="post-list-loading">
              <p>게시글을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="post-list-error">
              <p>{error}</p>
              <button onClick={fetchPosts} className="retry-button">다시 시도</button>
            </div>
          ) : posts.length === 0 ? (
            <div className="post-list-empty">
              <p>
                {isNoticeMode
                  ? '등록된 알림글이 없습니다.'
                  : (activeTab === 'mine' ? '작성한 게시글이 없습니다.' : '게시글이 없습니다.')}
              </p>
              {canCreate && (
                <Link to={createPath} className="post-create-link">
                  {isNoticeMode ? '첫 알림글을 작성해보세요!' : '첫 게시글을 작성해보세요!'}
                </Link>
              )}
            </div>
          ) : (
            posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                detailPathPrefix={detailPathPrefix}
                listIndex={index}
              />
            ))
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default PostList;
