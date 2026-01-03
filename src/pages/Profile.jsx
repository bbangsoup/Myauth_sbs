import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import './Profile.css';

/**
 * Profile 컴포넌트
 *
 * 사용자의 프로필 정보를 수정할 수 있는 페이지입니다.
 * 프로필 이미지, 닉네임, 이름, 연락처, 주소, 생년월일 등을 수정할 수 있습니다.
 *
 * 백엔드 DTO (UserProfileUpdateRequest)와 매핑:
 * - name: 닉네임 (User.name)
 * - profileImage: 프로필 이미지 URL (User.profileImage)
 * - lastName: 성 (UserProfile.lastName)
 * - firstName: 이름 (UserProfile.firstName)
 * - phoneNumber: 전화번호 (UserProfile.phoneNumber)
 * - country: 국가 코드 (UserProfile.country)
 * - address1: 주소1 (UserProfile.address1)
 * - address2: 주소2 (UserProfile.address2)
 * - birth: 생년월일 (UserProfile.birth)
 * - bgImage: 배경 이미지 URL (UserProfile.bgImage)
 */
function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, accessToken } = useAuth();

  // 파일 입력을 위한 ref (숨겨진 input 요소를 클릭하기 위해 사용)
  const fileInputRef = useRef(null);
  // 배경 이미지 파일 입력을 위한 ref
  const backgroundInputRef = useRef(null);

  // 프로필 이미지 미리보기 URL을 저장하는 상태
  const [previewImage, setPreviewImage] = useState(user?.profileImage || null);

  // 선택된 이미지 파일을 저장하는 상태 (서버 전송용)
  const [selectedFile, setSelectedFile] = useState(null);

  // 배경 이미지 미리보기 URL을 저장하는 상태
  const [previewBackground, setPreviewBackground] = useState(user?.bgImage || null);

  // 선택된 배경 이미지 파일을 저장하는 상태 (서버 전송용)
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState(null);

  // 폼 데이터를 관리하는 상태
  // 백엔드 UserProfileUpdateRequest DTO에 맞춰 필드 정의
  const [formData, setFormData] = useState({
    name: user?.name || '',          // 닉네임 (User.name)
    lastName: '',                    // 성 (UserProfile.lastName)
    firstName: '',                   // 이름 (UserProfile.firstName)
    phoneNumber: '',                 // 전화번호 (UserProfile.phoneNumber)
    country: '1',                    // 국가 코드 (UserProfile.country) - 기본값 1 (한국)
    address1: '',                    // 주소1 (UserProfile.address1)
    address2: '',                    // 주소2 (UserProfile.address2)
    birth: ''                        // 생년월일 (UserProfile.birth)
  });

  // 폼 유효성 검사 에러 메시지를 저장하는 상태
  const [errors, setErrors] = useState({});

  // API 요청 중인지 여부를 나타내는 로딩 상태
  const [isLoading, setIsLoading] = useState(false);

  /**
   * handleImageClick 함수
   *
   * 프로필 이미지 영역을 클릭했을 때 파일 선택 다이얼로그를 여는 함수입니다.
   */
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * handleImageChange 함수
   *
   * 이미지 파일이 선택되었을 때 호출되는 함수입니다.
   * 파일을 읽어서 미리보기 이미지를 표시합니다.
   *
   * @param {Event} e - 파일 입력 이벤트 객체
   */
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 선택된 파일 저장 (서버 전송용)
    setSelectedFile(file);

    // FileReader를 사용하여 이미지 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  /**
   * handleBackgroundClick 함수
   *
   * 배경 이미지 영역을 클릭했을 때 파일 선택 다이얼로그를 여는 함수입니다.
   */
  const handleBackgroundClick = () => {
    backgroundInputRef.current?.click();
  };

  /**
   * handleBackgroundChange 함수
   *
   * 배경 이미지 파일이 선택되었을 때 호출되는 함수입니다.
   * 파일을 읽어서 미리보기 이미지를 표시합니다.
   *
   * @param {Event} e - 파일 입력 이벤트 객체
   */
  const handleBackgroundChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 제한 (10MB - 배경 이미지는 더 큰 파일 허용)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 선택된 파일 저장 (서버 전송용)
    setSelectedBackgroundFile(file);

    // FileReader를 사용하여 이미지 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewBackground(reader.result);
    };
    reader.readAsDataURL(file);
  };

  /**
   * handleChange 함수
   *
   * 입력 필드의 값이 변경될 때 호출되는 이벤트 핸들러입니다.
   *
   * @param {Event} e - 입력 필드의 변경 이벤트 객체
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 해당 필드에 에러가 있다면 에러를 초기화합니다.
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  /**
   * validateForm 함수
   *
   * 폼의 유효성을 검사하는 함수입니다.
   *
   * @returns {boolean} - 모든 검증을 통과하면 true, 그렇지 않으면 false
   */
  const validateForm = () => {
    const newErrors = {};

    // 닉네임 검사 (필수)
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = '닉네임을 입력해주세요.';
    }

    // 전화번호 형식 검사 (선택 사항이지만, 입력 시 형식 검증)
    if (formData.phoneNumber) {
      // 숫자와 하이픈만 허용
      const phoneRegex = /^[\d-]+$/;
      if (!phoneRegex.test(formData.phoneNumber)) {
        newErrors.phoneNumber = '전화번호는 숫자와 하이픈(-)만 입력 가능합니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * uploadImage 함수
   *
   * 이미지 파일을 서버에 업로드하고 URL을 반환하는 함수입니다.
   *
   * 백엔드 API: POST /api/upload/image
   * 요청: multipart/form-data (file 필드)
   * 응답 예시:
   * {
   *   "message": "이미지가 성공적으로 업로드되었습니다.",
   *   "data": {
   *     "imageUrl": "http://16.184.53.118:8080/uploads/abc-123.jpg",
   *     "fileName": "abc-123.jpg",
   *     "originalFileName": "image.jpg",
   *     "fileSize": 245678,
   *     "contentType": "image/jpeg"
   *   }
   * }
   *
   * @param {File} file - 업로드할 이미지 파일
   * @param {string} type - 이미지 타입 ('profile' 또는 'background') - 로깅용
   * @returns {Promise<string|null>} - 업로드된 이미지 URL 또는 null
   */
  const uploadImage = async (file, type) => {
    if (!file) return null;

    // FormData 객체 생성 (multipart/form-data 전송용)
    const uploadFormData = new FormData();
    // 백엔드에서 'file' 필드명으로 받음
    uploadFormData.append('file', file);

    try {
      console.log(`=== ${type} 이미지 업로드 시작 ===`);
      console.log('파일명:', file.name);
      console.log('파일 크기:', file.size, 'bytes');
      console.log('파일 타입:', file.type);

      // 이미지 업로드 API 호출
      const response = await axios.post('/api/upload/image', uploadFormData, {
        headers: {
          // multipart/form-data는 axios가 자동으로 Content-Type과 boundary를 설정
          'Authorization': `Bearer ${accessToken}`
        },
        withCredentials: true
      });

      console.log('=== 업로드 응답 ===');
      console.log('응답 데이터:', response.data);

      // 백엔드 응답에서 imageUrl 추출
      // 응답 형식: { message: "...", data: { imageUrl: "...", ... } }
      if (response.data && response.data.data && response.data.data.imageUrl) {
        const imageUrl = response.data.data.imageUrl;
        console.log(`${type} 이미지 업로드 성공:`, imageUrl);
        return imageUrl;
      }

      // 응답 형식이 예상과 다른 경우
      console.error(`${type} 이미지 업로드 응답 형식 오류:`, response.data);
      return null;
    } catch (error) {
      console.error(`${type} 이미지 업로드 실패:`, error);
      // 에러 응답 상세 정보 출력
      if (error.response) {
        console.error('에러 상태:', error.response.status);
        console.error('에러 데이터:', error.response.data);
      }
      return null;
    }
  };

  /**
   * handleSubmit 함수
   *
   * 프로필 수정 폼을 제출할 때 호출되는 함수입니다.
   * 백엔드 UserProfileUpdateRequest DTO 형식에 맞춰 데이터를 전송합니다.
   *
   * @param {Event} e - 폼 제출 이벤트 객체
   */
  const handleSubmit = async (e) => {
    // 폼의 기본 제출 동작 방지 (페이지 새로고침 방지)
    e.preventDefault();

    // 폼 유효성 검사 실행
    if (!validateForm()) {
      return;
    }

    // 로딩 상태 시작
    setIsLoading(true);

    try {
      // 이미지 업로드 처리 (선택된 경우에만)
      let profileImageUrl = null;
      let bgImageUrl = null;

      // 프로필 이미지 업로드
      if (selectedFile) {
        profileImageUrl = await uploadImage(selectedFile, 'profile');
      }

      // 배경 이미지 업로드
      if (selectedBackgroundFile) {
        bgImageUrl = await uploadImage(selectedBackgroundFile, 'background');
      }

      // 백엔드 UserProfileUpdateRequest DTO에 맞춰 요청 데이터 구성
      const requestData = {
        // User 테이블 필드
        name: formData.name,                              // 닉네임
        profileImage: profileImageUrl,                    // 프로필 이미지 URL (새로 업로드한 경우)

        // UserProfile 테이블 필드
        lastName: formData.lastName || null,              // 성
        firstName: formData.firstName || null,            // 이름
        phoneNumber: formData.phoneNumber || null,        // 전화번호
        country: parseInt(formData.country, 10),          // 국가 코드 (Long 타입)
        address1: formData.address1 || null,              // 주소1
        address2: formData.address2 || null,              // 주소2
        birth: formData.birth ? `${formData.birth}T00:00:00` : null,  // LocalDateTime 형식
        bgImage: bgImageUrl                               // 배경 이미지 URL (새로 업로드한 경우)
      };

      console.log('=== 프로필 수정 요청 데이터 ===');
      console.log('Request Data:', requestData);

      // 프로필 수정 API 호출
      const response = await axios.put('/api/profile', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        withCredentials: true
      });

      if (response.data.success) {
        alert('프로필이 수정되었습니다.');
        // 홈 페이지로 이동
        navigate('/');
      } else {
        alert(response.data.message || '프로필 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('프로필 수정 에러:', error);

      // 에러 응답에서 메시지 추출
      const errorMessage = error.response?.data?.message
        || '프로필 수정 중 오류가 발생했습니다. 다시 시도해주세요.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * handleCancel 함수
   *
   * 취소 버튼 클릭 시 이전 페이지로 돌아가는 함수입니다.
   */
  const handleCancel = () => {
    navigate(-1);
  };

  // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <>
      <GNB />
      <div className="profile-container">
        <div className="profile-card">
          <h1>프로필 수정</h1>

          <form onSubmit={handleSubmit} className="profile-form">
            {/* 배경 이미지 + 프로필 이미지 통합 섹션 */}
            <div className="profile-header-section">
              {/* 배경 이미지 영역 */}
              <div
                className="profile-background-wrapper"
                onClick={handleBackgroundClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleBackgroundClick()}
                style={{
                  backgroundImage: previewBackground ? `url(${previewBackground})` : 'none'
                }}
              >
                {/* 배경 이미지가 없을 때 플레이스홀더 */}
                {!previewBackground && (
                  <div className="background-placeholder">
                    <span className="background-placeholder-icon">🖼️</span>
                    <span className="background-placeholder-text">배경 이미지 선택</span>
                  </div>
                )}
                {/* 호버 시 표시되는 오버레이 */}
                <div className="profile-background-overlay">
                  <span>📷 배경 변경</span>
                </div>
              </div>
              {/* 숨겨진 배경 이미지 파일 입력 */}
              <input
                type="file"
                ref={backgroundInputRef}
                onChange={handleBackgroundChange}
                accept="image/*"
                style={{ display: 'none' }}
              />

              {/* 프로필 이미지 (배경 위에 겹쳐서 표시) */}
              <div className="profile-image-container">
                <div
                  className="profile-image-wrapper"
                  onClick={handleImageClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleImageClick()}
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="프로필 이미지"
                      className="profile-image"
                    />
                  ) : (
                    <div className="profile-image-placeholder">
                      <span className="placeholder-icon">📷</span>
                      <span className="placeholder-text">이미지 선택</span>
                    </div>
                  )}
                  <div className="profile-image-overlay">
                    <span>변경</span>
                  </div>
                </div>
                {/* 숨겨진 프로필 이미지 파일 입력 */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            <p className="image-hint">프로필 이미지와 배경 이미지를 클릭하여 변경하세요</p>

            {/* 닉네임 */}
            <div className="form-group">
              <label htmlFor="name">닉네임 *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="닉네임을 입력하세요"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && (
                <span className="error-message">{errors.name}</span>
              )}
            </div>

            {/* 이름 섹션 (성 + 이름) */}
            <div className="form-row">
              <div className="form-group half">
                <label htmlFor="lastName">성</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="성을 입력하세요"
                  className={errors.lastName ? 'error' : ''}
                />
                {errors.lastName && (
                  <span className="error-message">{errors.lastName}</span>
                )}
              </div>
              <div className="form-group half">
                <label htmlFor="firstName">이름</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="이름을 입력하세요"
                  className={errors.firstName ? 'error' : ''}
                />
                {errors.firstName && (
                  <span className="error-message">{errors.firstName}</span>
                )}
              </div>
            </div>

            {/* 전화번호 */}
            <div className="form-group">
              <label htmlFor="phoneNumber">전화번호</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="010-1234-5678"
                className={errors.phoneNumber ? 'error' : ''}
              />
              {errors.phoneNumber && (
                <span className="error-message">{errors.phoneNumber}</span>
              )}
            </div>

            {/* 국가 선택 */}
            <div className="form-group">
              <label htmlFor="country">국가</label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className={errors.country ? 'error' : ''}
              >
                <option value="1">대한민국</option>
                <option value="2">미국</option>
                <option value="3">일본</option>
                <option value="4">중국</option>
                <option value="5">기타</option>
              </select>
              {errors.country && (
                <span className="error-message">{errors.country}</span>
              )}
            </div>

            {/* 주소 1 */}
            <div className="form-group">
              <label htmlFor="address1">주소 1</label>
              <input
                type="text"
                id="address1"
                name="address1"
                value={formData.address1}
                onChange={handleChange}
                placeholder="시/도, 구/군"
                className={errors.address1 ? 'error' : ''}
              />
              {errors.address1 && (
                <span className="error-message">{errors.address1}</span>
              )}
            </div>

            {/* 주소 2 */}
            <div className="form-group">
              <label htmlFor="address2">주소 2</label>
              <input
                type="text"
                id="address2"
                name="address2"
                value={formData.address2}
                onChange={handleChange}
                placeholder="상세 주소"
                className={errors.address2 ? 'error' : ''}
              />
              {errors.address2 && (
                <span className="error-message">{errors.address2}</span>
              )}
            </div>

            {/* 생년월일 */}
            <div className="form-group">
              <label htmlFor="birth">생년월일</label>
              <input
                type="date"
                id="birth"
                name="birth"
                value={formData.birth}
                onChange={handleChange}
                className={errors.birth ? 'error' : ''}
              />
              {errors.birth && (
                <span className="error-message">{errors.birth}</span>
              )}
            </div>

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

export default Profile;
