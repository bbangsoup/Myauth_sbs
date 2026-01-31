/**
 * 애플리케이션 설정 파일
 *
 * 환경 변수를 중앙에서 관리하고 기본값을 제공합니다.
 * Vite는 VITE_ 접두사가 붙은 환경 변수만 클라이언트에 노출합니다.
 *
 * 사용법:
 *   import { config } from '@/config';
 *   console.log(config.api.baseUrl);
 */

// ==========================================
// API 설정
// ==========================================
export const API_CONFIG = {
  // API 베이스 URL
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',

  // 인증 관련 API 베이스 URL
  authBaseUrl: import.meta.env.VITE_AUTH_BASE_URL || '/auth',

  // API 엔드포인트 정의
  endpoints: {
    // 인증 관련
    login: '/login',
    signup: '/signup',
    logout: '/logout',
    refresh: '/refresh',

    // 사용자 프로필
    profile: '/user/profile',

    // 파일 업로드
    uploadImage: '/upload/image',

    // OAuth (카카오)
    kakaoLogin: '/kakao/login',
    kakaoCallback: '/kakao/callback',
    kakaoExchangeToken: '/auth/kakao/exchange-token',
  },
};

// ==========================================
// 파일 업로드 설정
// ==========================================
export const UPLOAD_CONFIG = {
  // 프로필 이미지 최대 크기 (바이트)
  maxProfileImageSize: parseInt(
    import.meta.env.VITE_MAX_PROFILE_IMAGE_SIZE || '5242880', // 5MB
    10
  ),

  // 배경 이미지 최대 크기 (바이트)
  maxBackgroundImageSize: parseInt(
    import.meta.env.VITE_MAX_BACKGROUND_IMAGE_SIZE || '10485760', // 10MB
    10
  ),

  // 허용되는 이미지 MIME 타입
  allowedImageTypes: (
    import.meta.env.VITE_ALLOWED_IMAGE_TYPES ||
    'image/jpeg,image/png,image/gif,image/webp'
  ).split(','),

  // 파일 크기를 MB로 변환하는 헬퍼 함수
  bytesToMB: (bytes) => (bytes / (1024 * 1024)).toFixed(0),
};

// ==========================================
// OAuth 설정
// ==========================================
export const OAUTH_CONFIG = {
  // OAuth 콜백 경로
  callbackPath: import.meta.env.VITE_OAUTH_CALLBACK_PATH || '/oauth/callback',

  // 콜백 전체 URL 생성 함수
  getCallbackUrl: () => {
    return `${window.location.origin}${OAUTH_CONFIG.callbackPath}`;
  },
};

// ==========================================
// 애플리케이션 설정
// ==========================================
export const APP_CONFIG = {
  // 앱 이름
  name: import.meta.env.VITE_APP_NAME || 'SBS Application',

  // 앱 버전
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',

  // 디버그 모드
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',

  // API 요청 로그
  logApiRequests: import.meta.env.VITE_LOG_API_REQUESTS === 'true',
};

// ==========================================
// 폼 설정 (국가 목록 등)
// ==========================================
export const FORM_CONFIG = {
  // 국가 목록
  countries: [
    { value: '1', label: '대한민국' },
    { value: '2', label: '미국' },
    { value: '3', label: '일본' },
    { value: '4', label: '중국' },
    { value: '5', label: '기타' },
  ],

  // 기본 국가 코드
  defaultCountry: '1',
};

// ==========================================
// 유효성 검사 메시지
// ==========================================
export const VALIDATION_MESSAGES = {
  required: (field) => `${field}을(를) 입력해주세요.`,
  email: {
    required: '이메일을 입력해주세요.',
    invalid: '올바른 이메일 형식이 아닙니다.',
  },
  password: {
    required: '비밀번호를 입력해주세요.',
    minLength: (min) => `비밀번호는 ${min}자 이상이어야 합니다.`,
  },
  name: {
    required: '닉네임을 입력해주세요.',
  },
  phoneNumber: {
    invalid: '전화번호는 숫자와 하이픈(-)만 입력 가능합니다.',
  },
  image: {
    invalidType: '이미지 파일만 업로드할 수 있습니다.',
    tooLarge: (maxMB) => `파일 크기는 ${maxMB}MB 이하여야 합니다.`,
  },
};

// ==========================================
// 통합 설정 객체
// ==========================================
export const config = {
  api: API_CONFIG,
  upload: UPLOAD_CONFIG,
  oauth: OAUTH_CONFIG,
  app: APP_CONFIG,
  form: FORM_CONFIG,
  messages: VALIDATION_MESSAGES,
};

export default config;
