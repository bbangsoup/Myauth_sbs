import { useNavigate } from 'react-router-dom';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { usePostForm } from '../hooks/usePostForm';
import { FORM_CONFIG } from '../config';
import './PostCreate.css';

/**
 * PostCreate 컴포넌트
 *
 * 게시글 작성 페이지입니다.
 * - 게시글 내용 입력 (textarea)
 * - 공개 범위 선택 (PUBLIC, PRIVATE, FOLLOWERS)
 * - 이미지 첨부 (다중 선택 가능)
 * - 이미지 미리보기 및 개별 삭제
 */
function PostCreate({ postType = 'post' }) {
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated } = useAuth();
  const isNoticeMode = postType === 'notice';
  const canWriteNotice = Boolean(
    user && (user.role === 'ROLE_ADMIN' || user.isSuperUser === true || user.is_super_user === true)
  );
  const canCreate = isNoticeMode ? canWriteNotice : isAuthenticated;
  const listPath = isNoticeMode ? '/notices' : '/posts';
  const pageTitle = isNoticeMode ? '새 알림글 작성' : '새 게시글 작성';
  const successMessage = isNoticeMode ? '알림글이 작성되었습니다!' : '게시글이 작성되었습니다!';
  const failMessage = isNoticeMode ? '알림글 작성에 실패했습니다. 다시 시도해주세요.' : '게시글 작성에 실패했습니다. 다시 시도해주세요.';
  const authMessage = isNoticeMode
    ? '알림글을 작성하려면 관리자 권한이 필요합니다.'
    : '게시글을 작성하려면 로그인이 필요합니다.';

  // 게시글 작성 폼 커스텀 훅
  const {
    content,
    visibility,
    selectedImages,
    previewImages,
    errors,
    isLoading,
    setContent,
    setVisibility,
    handleImageSelect,
    removeImage,
    submitPost,
  } = usePostForm(accessToken, { postType });

  /**
   * 폼 제출 핸들러
   * 게시글 작성 API 호출 후 성공하면 목록 페이지로 이동합니다.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const success = await submitPost();
      if (success) {
        alert(successMessage);
        navigate(listPath);
      }
    } catch (err) {
      alert(failMessage);
    }
  };

  /**
   * 이미지 파일 선택 핸들러
   * input[type=file]의 onChange 이벤트에서 호출됩니다.
   */
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageSelect(e.target.files);
      // 같은 파일을 다시 선택할 수 있도록 input 값 초기화
      e.target.value = '';
    }
  };

  // 로그인하지 않은 사용자는 접근 불가
  if (!canCreate) {
    return (
      <>
        <GNB />
        <div className="post-create-container">
          <div className="post-create-card">
            <p className="post-create-auth-message">
              {authMessage}
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <GNB />
      <div className="post-create-container">
        <div className="post-create-card">
          <h1>{pageTitle}</h1>

          <form onSubmit={handleSubmit}>
            {/* 게시글 내용 입력 */}
            <div className="form-group">
              <label htmlFor="content">내용</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="무슨 이야기를 나누고 싶으신가요?"
                rows={6}
                maxLength={5000}
                className={errors.content ? 'error' : ''}
              />
              {/* 글자 수 표시 */}
              <div className="char-count">
                <span className={content.length > 4500 ? 'warning' : ''}>
                  {content.length}
                </span>
                / 5000
              </div>
              {/* 유효성 에러 메시지 */}
              {errors.content && (
                <p className="error-message">{errors.content}</p>
              )}
            </div>

            {/* 공개 범위 선택 */}
            <div className="form-group">
              <label htmlFor="visibility">공개 범위</label>
              <select
                id="visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                {FORM_CONFIG.visibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 이미지 첨부 */}
            <div className="form-group">
              <label>이미지 첨부</label>
              <label className="image-upload-button" htmlFor="image-input">
                📷 사진 추가
              </label>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* 이미지 미리보기 목록 */}
            {previewImages.length > 0 && (
              <div className="image-preview-list">
                {previewImages.map((src, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={src} alt={`미리보기 ${index + 1}`} />
                    {/* 이미지 제거 버튼 */}
                    <button
                      type="button"
                      className="image-remove-button"
                      onClick={() => removeImage(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 하단 버튼 영역 */}
            <div className="post-create-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => navigate(listPath)}
              >
                취소
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? '작성 중...' : '게시하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default PostCreate;
