import { useState } from 'react';
import axios from 'axios';
import {
  API_CONFIG,
  UPLOAD_CONFIG,
  VALIDATION_MESSAGES
} from '../config';

/**
 * usePostForm 커스텀 훅
 *
 * 게시글 작성에 필요한 상태와 로직을 관리합니다.
 * - 게시글 내용(content) 및 공개 범위(visibility) 관리
 * - 이미지 파일 선택 및 미리보기
 * - 폼 유효성 검사
 * - 서버 제출 (multipart/form-data)
 *
 * @param {string} accessToken - JWT 액세스 토큰
 * @returns {Object} 게시글 폼 관련 상태 및 함수
 */
export function usePostForm(accessToken, { postType = 'post' } = {}) {
  // ==========================================
  // 상태 정의
  // ==========================================
  const [content, setContent] = useState('');              // 게시글 내용
  const [visibility, setVisibility] = useState('PUBLIC');  // 공개 범위
  const [selectedImages, setSelectedImages] = useState([]); // 선택된 이미지 파일 배열
  const [previewImages, setPreviewImages] = useState([]);   // 이미지 미리보기 URL 배열
  const [errors, setErrors] = useState({});                // 유효성 에러
  const [isLoading, setIsLoading] = useState(false);       // 제출 중 로딩

  // ==========================================
  // 이미지 처리
  // ==========================================

  /**
   * 이미지 파일 추가
   * 여러 이미지를 선택할 수 있으며, FileReader로 미리보기를 생성합니다.
   *
   * @param {FileList} files - 선택된 파일 목록
   */
  const handleImageSelect = (files) => {
    const fileArray = Array.from(files);

    // 각 파일 유효성 검사
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        alert(VALIDATION_MESSAGES.image.invalidType);
        return;
      }
      if (file.size > UPLOAD_CONFIG.maxBackgroundImageSize) {
        const maxMB = UPLOAD_CONFIG.bytesToMB(UPLOAD_CONFIG.maxBackgroundImageSize);
        alert(VALIDATION_MESSAGES.image.tooLarge(maxMB));
        return;
      }
    }

    // 기존 선택된 이미지에 새 이미지 추가
    setSelectedImages(prev => [...prev, ...fileArray]);

    // 미리보기 생성
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * 특정 이미지 제거
   * @param {number} index - 제거할 이미지의 인덱스
   */
  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // 유효성 검사
  // ==========================================

  /**
   * 폼 유효성 검사
   * @returns {boolean} 검증 통과 여부
   */
  const validateForm = () => {
    const newErrors = {};

    // 게시글 내용 필수
    if (!content.trim()) {
      newErrors.content = VALIDATION_MESSAGES.post.contentRequired;
    }

    // 게시글 최대 길이 (5000자)
    if (content.length > 5000) {
      newErrors.content = VALIDATION_MESSAGES.post.contentTooLong;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==========================================
  // 게시글 제출
  // ==========================================

  /**
   * 게시글을 서버에 제출합니다.
   * 이미지가 있으면 /api/posts/with-images (multipart),
   * 없으면 /api/posts (JSON)로 전송합니다.
   *
   * @returns {Promise<boolean>} 성공 여부
   */
  const submitPost = async () => {
    if (!validateForm()) return false;

    setIsLoading(true);

    try {
      let response;
      const isNotice = postType === 'notice';
      const postEndpoint = isNotice ? API_CONFIG.endpoints.notices : API_CONFIG.endpoints.posts;
      const postWithImagesEndpoint = isNotice
        ? API_CONFIG.endpoints.noticesWithImages
        : API_CONFIG.endpoints.postsWithImages;

      if (selectedImages.length > 0) {
        // 이미지가 있는 경우: multipart/form-data로 전송
        const formData = new FormData();

        // 게시글 데이터를 JSON Blob으로 추가
        const postData = JSON.stringify({ content, visibility });
        formData.append('post', new Blob([postData], { type: 'application/json' }));

        // 이미지 파일들 추가
        selectedImages.forEach(file => {
          formData.append('images', file);
        });

        const url = `${API_CONFIG.baseUrl}${postWithImagesEndpoint}`;
        response = await axios.post(url, formData, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          withCredentials: true
        });
      } else {
        // 텍스트만: JSON으로 전송
        const url = `${API_CONFIG.baseUrl}${postEndpoint}`;
        response = await axios.post(url, { content, visibility }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          withCredentials: true
        });
      }

      console.log('게시글 작성 응답:', response.data);
      return response.data?.success || response.status === 200 || response.status === 201;
    } catch (err) {
      console.error('게시글 작성 실패:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 반환값
  // ==========================================
  return {
    // 상태
    content,
    visibility,
    selectedImages,
    previewImages,
    errors,
    isLoading,

    // 핸들러
    setContent,
    setVisibility,
    handleImageSelect,
    removeImage,
    submitPost,
  };
}
