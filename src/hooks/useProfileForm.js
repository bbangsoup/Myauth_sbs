import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  API_CONFIG,
  UPLOAD_CONFIG,
  FORM_CONFIG,
  VALIDATION_MESSAGES
} from '../config';

/**
 * useProfileForm 커스텀 훅
 *
 * 프로필 수정에 필요한 모든 상태와 로직을 관리합니다.
 * - 프로필 데이터 로드
 * - 폼 데이터 관리
 * - 이미지 업로드
 * - 폼 제출
 *
 * @param {string} accessToken - JWT 액세스 토큰
 * @returns {Object} 프로필 폼 관련 상태 및 함수
 */
export function useProfileForm(accessToken) {
  // ==========================================
  // 상태 정의
  // ==========================================

  // 폼 데이터 (백엔드 UserProfileUpdateRequest DTO에 맞춤)
  const [formData, setFormData] = useState({
    name: '',                              // 닉네임
    lastName: '',                          // 성
    firstName: '',                         // 이름
    phoneNumber: '',                       // 전화번호
    country: FORM_CONFIG.defaultCountry,   // 국가 코드 (설정에서 기본값 가져옴)
    address1: '',                          // 주소1
    address2: '',                          // 주소2
    birth: ''                              // 생년월일
  });

  // 이미지 관련 상태
  const [previewImage, setPreviewImage] = useState(null);           // 프로필 이미지 미리보기 URL
  const [previewBackground, setPreviewBackground] = useState(null); // 배경 이미지 미리보기 URL
  const [selectedFile, setSelectedFile] = useState(null);           // 선택된 프로필 이미지 파일
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState(null); // 선택된 배경 이미지 파일

  // UI 상태
  const [errors, setErrors] = useState({});           // 폼 유효성 에러
  const [isLoading, setIsLoading] = useState(false);  // 제출 중 로딩
  const [isLoadingProfile, setIsLoadingProfile] = useState(true); // 프로필 로드 중

  // ==========================================
  // 프로필 데이터 로드
  // ==========================================
  useEffect(() => {
    const loadProfile = async () => {
      if (!accessToken) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        // API 엔드포인트를 config에서 가져옴
        const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profile}`;
        const response = await axios.get(url, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          withCredentials: true
        });

        if (response.data?.data) {
          const data = response.data.data;

          // 이미지 URL 설정
          if (data.profileImage) setPreviewImage(data.profileImage);
          if (data.bgImage) setPreviewBackground(data.bgImage);

          // 폼 데이터 설정
          setFormData({
            name: data.name || '',
            lastName: data.lastName || '',
            firstName: data.firstName || '',
            phoneNumber: data.phoneNumber || '',
            country: data.country?.toString() || FORM_CONFIG.defaultCountry,
            address1: data.address1 || '',
            address2: data.address2 || '',
            birth: data.birth ? data.birth.split('T')[0] : ''
          });
        }
      } catch (error) {
        console.error('프로필 조회 실패:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [accessToken]);

  // ==========================================
  // 폼 입력 핸들러
  // ==========================================

  /**
   * 입력 필드 변경 핸들러
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // ==========================================
  // 이미지 처리 함수
  // ==========================================

  /**
   * 이미지 파일 선택 처리
   * @param {File} file - 선택된 파일
   * @param {string} type - 'profile' 또는 'background'
   * @returns {boolean} 유효성 검사 통과 여부
   */
  const handleImageSelect = (file, type) => {
    if (!file) return false;

    // 이미지 파일 유효성 검사 (config에서 허용 타입 확인)
    const isValidType = UPLOAD_CONFIG.allowedImageTypes.some(
      allowedType => file.type === allowedType || file.type.startsWith('image/')
    );

    if (!isValidType) {
      alert(VALIDATION_MESSAGES.image.invalidType);
      return false;
    }

    // 파일 크기 제한 (config에서 설정값 가져옴)
    const maxSize = type === 'profile'
      ? UPLOAD_CONFIG.maxProfileImageSize
      : UPLOAD_CONFIG.maxBackgroundImageSize;

    if (file.size > maxSize) {
      const maxMB = UPLOAD_CONFIG.bytesToMB(maxSize);
      alert(VALIDATION_MESSAGES.image.tooLarge(maxMB));
      return false;
    }

    // 파일 저장 및 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'profile') {
        setSelectedFile(file);
        setPreviewImage(reader.result);
      } else {
        setSelectedBackgroundFile(file);
        setPreviewBackground(reader.result);
      }
    };
    reader.readAsDataURL(file);

    return true;
  };

  /**
   * 이미지 서버 업로드
   * @param {File} file - 업로드할 파일
   * @returns {Promise<string|null>} 업로드된 이미지 URL
   */
  const uploadImage = async (file) => {
    if (!file) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      // API 엔드포인트를 config에서 가져옴
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.uploadImage}`;
      const response = await axios.post(url, uploadFormData, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        withCredentials: true
      });

      return response.data?.data?.imageUrl || null;
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      return null;
    }
  };

  // ==========================================
  // 폼 유효성 검사
  // ==========================================

  /**
   * 폼 유효성 검사
   * @returns {boolean} 검증 통과 여부
   */
  const validateForm = () => {
    const newErrors = {};

    // 닉네임 필수 검사
    if (!formData.name?.trim()) {
      newErrors.name = VALIDATION_MESSAGES.name.required;
    }

    // 전화번호 형식 검사 (선택사항)
    if (formData.phoneNumber && !/^[\d-]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = VALIDATION_MESSAGES.phoneNumber.invalid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==========================================
  // 폼 제출
  // ==========================================

  /**
   * 프로필 수정 제출
   * @returns {Promise<boolean>} 성공 여부
   */
  const submitProfile = async () => {
    if (!validateForm()) return false;

    setIsLoading(true);

    try {
      // 이미지 업로드 (새 파일 선택 시에만)
      let profileImageUrl = previewImage;
      let bgImageUrl = previewBackground;

      // Base64 Data URL인 경우 (새로 선택한 이미지) 업로드 진행
      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile);
        if (uploadedUrl) profileImageUrl = uploadedUrl;
      }

      if (selectedBackgroundFile) {
        const uploadedUrl = await uploadImage(selectedBackgroundFile);
        if (uploadedUrl) bgImageUrl = uploadedUrl;
      }

      // Base64 Data URL이 남아있으면 null로 처리 (업로드 실패 케이스)
      if (profileImageUrl?.startsWith('data:')) profileImageUrl = null;
      if (bgImageUrl?.startsWith('data:')) bgImageUrl = null;

      // 요청 데이터 구성
      const requestData = {
        name: formData.name,
        profileImage: profileImageUrl || null,
        lastName: formData.lastName || null,
        firstName: formData.firstName || null,
        phoneNumber: formData.phoneNumber || null,
        country: parseInt(formData.country, 10),
        address1: formData.address1 || null,
        address2: formData.address2 || null,
        birth: formData.birth ? `${formData.birth}T00:00:00` : null,
        bgImage: bgImageUrl || null
      };

      // API 엔드포인트를 config에서 가져옴
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profile}`;
      const response = await axios.put(url, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        withCredentials: true
      });

      return response.data?.success || response.status === 200;
    } catch (error) {
      console.error('프로필 수정 실패:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 반환값
  // ==========================================
  return {
    // 상태
    formData,
    errors,
    isLoading,
    isLoadingProfile,
    previewImage,
    previewBackground,

    // 핸들러
    handleChange,
    handleImageSelect,
    validateForm,
    submitProfile
  };
}
