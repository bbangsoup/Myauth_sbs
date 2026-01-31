import { useNavigate } from 'react-router-dom';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import ProfileImageSection from '../components/ProfileImageSection';
import { useAuth } from '../hooks/useAuth';
import { useProfileForm } from '../hooks/useProfileForm';
import { FORM_CONFIG } from '../config';
import './Profile.css';

/**
 * Profile 컴포넌트
 *
 * 사용자 프로필 수정 페이지
 * - 프로필/배경 이미지 업로드
 * - 닉네임, 이름, 연락처, 주소, 생년월일 수정
 */
function Profile() {
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useAuth();

  // 프로필 폼 관련 상태 및 로직 (커스텀 훅 사용)
  const {
    formData,
    errors,
    isLoading,
    isLoadingProfile,
    previewImage,
    previewBackground,
    handleChange,
    handleImageSelect,
    submitProfile
  } = useProfileForm(accessToken);

  // ==========================================
  // 이벤트 핸들러
  // ==========================================

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const success = await submitProfile();
      if (success) {
        alert('프로필이 수정되었습니다.');
        navigate('/');
      } else {
        alert('프로필 수정에 실패했습니다.');
      }
    } catch (error) {
      const message = error.response?.data?.message || '프로필 수정 중 오류가 발생했습니다.';
      alert(message);
    }
  };

  /**
   * 취소 버튼 핸들러
   */
  const handleCancel = () => navigate(-1);

  // ==========================================
  // 렌더링 조건 처리
  // ==========================================

  // 미인증 사용자 리다이렉트
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  // 프로필 로딩 중
  if (isLoadingProfile) {
    return (
      <>
        <GNB />
        <div className="profile-container">
          <div className="profile-card">
            <h1>프로필 수정</h1>
            <div className="profile-loading">
              <p>프로필 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  };

  // ==========================================
  // 메인 렌더링
  // ==========================================
  return (
    <>
      <GNB />
      <div className="profile-container">
        <div className="profile-card">
          <h1>프로필 수정</h1>

          <form onSubmit={handleSubmit} className="profile-form">
            {/* 이미지 섹션 (프로필 + 배경) */}
            <ProfileImageSection
              previewImage={previewImage}
              previewBackground={previewBackground}
              onImageSelect={handleImageSelect}
            />

            {/* 닉네임 (필수) */}
            <FormField
              label="닉네임"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="닉네임을 입력하세요"
              required
            />

            {/* 이름 섹션 (성 + 이름) */}
            <div className="form-row">
              <FormField
                label="성"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                placeholder="성을 입력하세요"
                half
              />
              <FormField
                label="이름"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                placeholder="이름을 입력하세요"
                half
              />
            </div>

            {/* 전화번호 */}
            <FormField
              label="전화번호"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              error={errors.phoneNumber}
              placeholder="010-1234-5678"
            />

            {/* 국가 선택 (config에서 국가 목록 가져옴) */}
            <div className="form-group">
              <label htmlFor="country">국가</label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
              >
                {FORM_CONFIG.countries.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 주소 */}
            <FormField
              label="주소 1"
              name="address1"
              value={formData.address1}
              onChange={handleChange}
              placeholder="시/도, 구/군"
            />
            <FormField
              label="주소 2"
              name="address2"
              value={formData.address2}
              onChange={handleChange}
              placeholder="상세 주소"
            />

            {/* 생년월일 */}
            <FormField
              label="생년월일"
              name="birth"
              type="date"
              value={formData.birth}
              onChange={handleChange}
            />

            {/* 버튼 그룹 */}
            <div className="button-group">
              <button
                type="button"
                className="cancel-button"
                onClick={handleCancel}
                disabled={isLoading}
              >
                취소
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}

// ==========================================
// 재사용 가능한 폼 필드 컴포넌트
// ==========================================

/**
 * FormField 컴포넌트
 *
 * 공통 입력 필드 UI를 제공합니다.
 */
function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required,
  half
}) {
  return (
    <div className={`form-group ${half ? 'half' : ''}`}>
      <label htmlFor={name}>
        {label} {required && '*'}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={error ? 'error' : ''}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

export default Profile;
