import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { API_CONFIG } from '../config';
import { isAdminUser as checkIsAdminUser } from '../utils/auth';
import './Admin.css';

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'];
const ROLE_OPTIONS = ['ROLE_USER', 'ROLE_ADMIN'];
const TREND_RANGE_OPTIONS = [7, 14, 30];

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateLabel(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function formatAxisDateLabel(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(5);
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}.${day}`;
}

function toCount(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickSummaryValue(source, ...keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }

  return undefined;
}

function normalizeSummary(payload) {
  const summary = payload && typeof payload === 'object' ? payload : {};

  return {
    totalUsers: toCount(pickSummaryValue(summary, 'totalUsers', 'userCount', 'usersCount', 'memberCount')),
    activeUsers: toCount(pickSummaryValue(summary, 'activeUsers', 'activeUserCount', 'activeMembers')),
    suspendedUsers: toCount(pickSummaryValue(summary, 'suspendedUsers', 'suspendedUserCount')),
    adminUsers: toCount(pickSummaryValue(summary, 'adminUsers', 'adminCount', 'adminUserCount')),
    totalPosts: toCount(pickSummaryValue(summary, 'totalPosts', 'postCount', 'postsCount')),
    activePosts: toCount(pickSummaryValue(summary, 'activePosts', 'activePostCount')),
    deletedPosts: toCount(pickSummaryValue(summary, 'deletedPosts', 'deletedPostCount')),
    totalComments: toCount(pickSummaryValue(summary, 'totalComments', 'commentCount', 'commentsCount')),
    activeComments: toCount(pickSummaryValue(summary, 'activeComments', 'activeCommentCount')),
    deletedComments: toCount(pickSummaryValue(summary, 'deletedComments', 'deletedCommentCount')),
    newUsersToday: toCount(pickSummaryValue(summary, 'newUsersToday', 'todayNewUsers', 'todayUsers')),
    newPostsToday: toCount(pickSummaryValue(summary, 'newPostsToday', 'todayNewPosts', 'todayPosts')),
    newCommentsToday: toCount(pickSummaryValue(summary, 'newCommentsToday', 'todayNewComments', 'todayComments')),
  };
}

function resolveDashboardPayload(response) {
  const topLevel = response?.data;
  const primary = topLevel?.data ?? topLevel?.result ?? topLevel ?? {};
  const nested = primary?.summary && typeof primary.summary === 'object' ? primary.summary : null;
  const payload = nested || primary;

  return payload && typeof payload === 'object' ? payload : {};
}

function toTrendRows(payload) {
  const nestedDailyStats = payload?.dailyStats;
  const normalizedNestedDailyStats = Array.isArray(nestedDailyStats)
    ? nestedDailyStats
    : (Array.isArray(nestedDailyStats?.content) ? nestedDailyStats.content : null);
  const candidates = [
    normalizedNestedDailyStats,
    payload?.daily_stats,
    payload?.activityTrend,
    payload?.activity_trend,
    payload?.trend,
    payload?.trends,
    payload?.recentActivity,
    payload?.dailyActivity,
    payload?.daily_activity,
  ];

  const rawRows = candidates.find(Array.isArray) || [];

  return rawRows
    .map((item, index) => {
      const dateValue = item?.date ?? item?.day ?? item?.targetDate ?? item?.label;
      const date = dateValue ? new Date(dateValue) : null;
      const timestamp = date && !Number.isNaN(date.getTime()) ? date.getTime() : null;

      return {
        key: timestamp ?? `${dateValue ?? 'trend'}-${index}`,
        date: timestamp ? formatDateLabel(date) : String(dateValue ?? '-'),
        timestamp,
        users: toCount(item?.users ?? item?.newUsers ?? item?.userCount),
        posts: toCount(item?.posts ?? item?.newPosts ?? item?.postCount),
        comments: toCount(item?.comments ?? item?.newComments ?? item?.commentCount),
      };
    })
    .filter((item) => item.date && item.date !== '-')
    .sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return String(a.date).localeCompare(String(b.date), 'ko');
    });
}

function buildChartPath(points) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function buildChartPoints(values) {
  const chartWidth = 688;
  const chartHeight = 192;
  const maxValue = Math.max(...values, 1);

  return values.map((value, index) => {
    const x = 36 + ((chartWidth / Math.max(values.length - 1, 1)) * index);
    const y = 220 - ((value / maxValue) * chartHeight);
    return { x, y, value };
  });
}

function buildTrendWindow(rows, days) {
  const safeDays = Math.max(days, 1);
  const rowsByDate = new Map(rows.map((row) => [row.date, row]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: safeDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (safeDays - index - 1));
    const label = formatDateLabel(date);
    const row = rowsByDate.get(label);

    return {
      key: row?.key ?? `trend-window-${label}`,
      date: label,
      timestamp: row?.timestamp ?? date.getTime(),
      users: row?.users ?? 0,
      posts: row?.posts ?? 0,
      comments: row?.comments ?? 0,
    };
  });
}

function Admin() {
  const { user, accessToken, isLoading } = useAuth();
  const isAdminUser = checkIsAdminUser(user);

  const [summary, setSummary] = useState(normalizeSummary(null));
  const [trendRows, setTrendRows] = useState([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [usersTotalElements, setUsersTotalElements] = useState(0);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [isUserDetailLoading, setIsUserDetailLoading] = useState(false);
  const [userFilters, setUserFilters] = useState({
    keyword: '',
    status: '',
    role: '',
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(0);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  const [isMutating, setIsMutating] = useState(false);
  const [moderationTarget, setModerationTarget] = useState('post');
  const [moderationTargetId, setModerationTargetId] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [selectedTrendDays, setSelectedTrendDays] = useState(7);

  const getAuthConfig = () => ({
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    withCredentials: true,
  });

  const fetchSummary = async () => {
    setIsSummaryLoading(true);
    setSummaryError('');
    try {
      const response = await axios.get(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminDashboardSummary}`,
        getAuthConfig()
      );
      const payload = resolveDashboardPayload(response);
      setSummary(normalizeSummary(payload));
      setTrendRows(toTrendRows(payload));
    } catch (error) {
      console.error('관리자 대시보드 요약 조회 실패:', error);
      setSummaryError(error?.response?.data?.message || error?.message || '관리자 대시보드 데이터를 불러오지 못했습니다.');
      setSummary(normalizeSummary(null));
      setTrendRows([]);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const fetchUsers = async (page = usersPage, filters = userFilters) => {
    setIsUsersLoading(true);
    try {
      const response = await axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminUsers}`, {
        ...getAuthConfig(),
        params: {
          page,
          size: 12,
          keyword: filters.keyword || undefined,
          status: filters.status || undefined,
          role: filters.role || undefined,
        },
      });

      const data = response?.data?.data;
      setUsers(Array.isArray(data?.content) ? data.content : []);
      setUsersPage(Number(data?.number ?? page ?? 0));
      setUsersTotalPages(Number(data?.totalPages ?? 0));
      setUsersTotalElements(Number(data?.totalElements ?? 0));
    } catch (error) {
      console.error('관리자 사용자 목록 조회 실패:', error);
      setUsers([]);
      setUsersTotalPages(0);
      setUsersTotalElements(0);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchUserDetail = async (userId) => {
    setIsUserDetailLoading(true);
    try {
      const response = await axios.get(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminUsers}/${userId}`,
        getAuthConfig()
      );
      setSelectedUserDetail(response?.data?.data || null);
    } catch (error) {
      console.error('관리자 사용자 상세 조회 실패:', error);
      alert(error?.response?.data?.message || '사용자 상세 조회에 실패했습니다.');
    } finally {
      setIsUserDetailLoading(false);
    }
  };

  const fetchAuditLogs = async (page = auditPage) => {
    setIsAuditLoading(true);
    try {
      const response = await axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminAuditLogs}`, {
        ...getAuthConfig(),
        params: { page, size: 10 },
      });

      const data = response?.data?.data;
      setAuditLogs(Array.isArray(data?.content) ? data.content : []);
      setAuditPage(Number(data?.number ?? page ?? 0));
      setAuditTotalPages(Number(data?.totalPages ?? 0));
    } catch (error) {
      console.error('관리자 감사 로그 조회 실패:', error);
      setAuditLogs([]);
      setAuditTotalPages(0);
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken || !isAdminUser) return;

    fetchSummary();
    fetchUsers(0, userFilters);
    fetchAuditLogs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isAdminUser]);

  const refreshAdminData = async () => {
    await Promise.all([
      fetchSummary(),
      fetchUsers(usersPage, userFilters),
      fetchAuditLogs(auditPage),
    ]);

    if (selectedUserDetail?.id) {
      await fetchUserDetail(selectedUserDetail.id);
    }
  };

  const handleStatusUpdate = async (targetUser, nextStatus) => {
    const reason = window.prompt('상태 변경 사유를 입력하세요. 비워두면 기록하지 않습니다.', '') ?? '';
    const payload = {
      status: nextStatus,
      reason: reason.trim() || null,
    };

    if (nextStatus === 'SUSPENDED') {
      const rawDays = window.prompt('정지 일수를 입력하세요.', '7');
      if (!rawDays) return;

      payload.suspendDays = Number(rawDays);
      if (!Number.isFinite(payload.suspendDays) || payload.suspendDays < 1) {
        alert('정지 일수는 1 이상의 숫자여야 합니다.');
        return;
      }
    }

    setIsMutating(true);
    try {
      await axios.patch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminUsers}/${targetUser.id}/status`,
        payload,
        getAuthConfig()
      );
      await refreshAdminData();
    } catch (error) {
      console.error('관리자 사용자 상태 변경 실패:', error);
      alert(error?.response?.data?.message || '사용자 상태 변경에 실패했습니다.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleRoleUpdate = async (targetUser, nextRole) => {
    const reason = window.prompt('권한 변경 사유를 입력하세요. 비워두면 기록하지 않습니다.', '') ?? '';
    const isSuperUser = nextRole === 'ROLE_ADMIN'
      ? window.confirm('이 사용자를 super admin으로 지정할까요?')
      : false;

    setIsMutating(true);
    try {
      await axios.patch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminUsers}/${targetUser.id}/role`,
        {
          role: nextRole,
          isSuperUser,
          reason: reason.trim() || null,
        },
        getAuthConfig()
      );
      await refreshAdminData();
    } catch (error) {
      console.error('관리자 사용자 권한 변경 실패:', error);
      alert(error?.response?.data?.message || '사용자 권한 변경에 실패했습니다.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleModerationSubmit = async (event) => {
    event.preventDefault();

    const numericId = Number(moderationTargetId);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      alert('삭제 대상 ID를 올바르게 입력하세요.');
      return;
    }

    const endpoint = moderationTarget === 'post'
      ? `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminPosts}/${numericId}`
      : `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminComments}/${numericId}`;

    setIsMutating(true);
    try {
      await axios.delete(endpoint, {
        ...getAuthConfig(),
        data: {
          reason: moderationReason.trim() || null,
        },
      });

      alert(`${moderationTarget === 'post' ? '게시물' : '댓글'}이 강제 삭제되었습니다.`);
      setModerationTargetId('');
      setModerationReason('');
      await refreshAdminData();
    } catch (error) {
      console.error('관리자 강제 삭제 실패:', error);
      alert(error?.response?.data?.message || '강제 삭제에 실패했습니다.');
    } finally {
      setIsMutating(false);
    }
  };

  const summaryCards = useMemo(() => ([
    ['전체 사용자', summary.totalUsers],
    ['활성 사용자', summary.activeUsers],
    ['정지 사용자', summary.suspendedUsers],
    ['관리자 수', summary.adminUsers],
    ['전체 게시물', summary.totalPosts],
    ['삭제 게시물', summary.deletedPosts],
    ['전체 댓글', summary.totalComments],
    ['삭제 댓글', summary.deletedComments],
    ['오늘 가입', summary.newUsersToday],
    ['오늘 게시물', summary.newPostsToday],
    ['오늘 댓글', summary.newCommentsToday],
  ]), [summary]);

  const progressMetrics = useMemo(() => ([
    {
      label: '사용자 활성률',
      value: Math.round((summary.activeUsers / Math.max(summary.totalUsers, 1)) * 100),
      tone: 'users',
      detail: `${summary.activeUsers} / ${summary.totalUsers}`,
    },
    {
      label: '게시물 유지율',
      value: Math.round((summary.activePosts / Math.max(summary.totalPosts, 1)) * 100),
      tone: 'posts',
      detail: `${summary.activePosts} / ${summary.totalPosts}`,
    },
    {
      label: '댓글 유지율',
      value: Math.round((summary.activeComments / Math.max(summary.totalComments, 1)) * 100),
      tone: 'comments',
      detail: `${summary.activeComments} / ${summary.totalComments}`,
    },
  ]), [summary]);

  const visibleTrendRows = useMemo(
    () => buildTrendWindow(trendRows, selectedTrendDays),
    [trendRows, selectedTrendDays]
  );

  const chartSeries = useMemo(() => {
    const sourceRows = visibleTrendRows;
    const series = [
      { key: 'users', label: '가입', colorClassName: 'users', values: sourceRows.map((row) => row.users) },
      { key: 'posts', label: '게시물', colorClassName: 'posts', values: sourceRows.map((row) => row.posts) },
      { key: 'comments', label: '댓글', colorClassName: 'comments', values: sourceRows.map((row) => row.comments) },
    ];

    return series.map((item) => ({
      ...item,
      points: buildChartPoints(item.values),
      lastValue: item.values[item.values.length - 1] ?? 0,
    }));
  }, [visibleTrendRows]);

  const trendYearLabel = useMemo(() => {
    const lastDate = visibleTrendRows[visibleTrendRows.length - 1]?.date;
    if (!lastDate) return '';

    return `${String(lastDate).slice(2, 4)}년 데이터`;
  }, [visibleTrendRows]);

  if (isLoading) {
    return (
      <>
        <GNB />
        <main className="admin-page admin-state-page">
          <p>관리자 화면을 준비하는 중입니다.</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!isAdminUser) {
    return (
      <>
        <GNB />
        <main className="admin-page admin-state-page">
          <h1>관리자 전용 화면</h1>
          <p>현재 계정으로는 접근할 수 없습니다.</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <GNB />
      <main className="admin-page">
        <section className="admin-nav-tabs">
          <Link to="/posts" className="admin-nav-tab">
            게시글
          </Link>
          <Link to="/admin/dashboard" className="admin-nav-tab active">
            관리자
          </Link>
        </section>

        <section className="admin-hero">
          <div>
            <p className="admin-eyebrow">ADMIN CONSOLE</p>
            <h1>운영 대시보드</h1>
            <p className="admin-hero-copy">
              요약 지표, 사용자 관리, 강제 삭제, 감사 로그를 한 화면에서 확인합니다.
            </p>
          </div>
          <button type="button" className="admin-refresh-button" onClick={refreshAdminData} disabled={isMutating}>
            새로고침
          </button>
        </section>

        <section className="admin-section">
          <div className="admin-section-head">
            <h2>대시보드 요약</h2>
            {isSummaryLoading && <span>불러오는 중...</span>}
          </div>
          {summaryError && <p className="admin-section-error">{summaryError}</p>}
          <div className="admin-summary-grid">
            {summaryCards.map(([label, value]) => (
              <article key={label} className="admin-summary-card">
                <span>{label}</span>
                <strong>{toCount(value)}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-head admin-line-chart-head">
            <div>
              <h2>활동 추이</h2>
              <span>백엔드가 내려준 실제 일자별 통계만 그래프로 표시합니다.</span>
            </div>
            <div className="admin-range-tabs">
              {TREND_RANGE_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  className={selectedTrendDays === days ? 'active' : ''}
                  onClick={() => setSelectedTrendDays(days)}
                >
                  {days}일
                </button>
              ))}
            </div>
          </div>

          <div className="admin-line-chart-card">
            {summaryError ? (
              <div className="admin-line-chart-empty">
                <strong>활동 추이를 불러오지 못했습니다.</strong>
                <p>{summaryError}</p>
              </div>
            ) : trendRows.length === 0 ? (
              <div className="admin-line-chart-empty">
                <strong>실제 일자별 활동 데이터가 아직 없습니다.</strong>
                <p>
                  `/api/admin/dashboard` 응답에 날짜별 가입, 게시물, 댓글 통계를 배열로 내려주면
                  최근 7일, 14일, 30일 추이를 바로 표시할 수 있습니다.
                </p>
              </div>
            ) : (
              <>
                <div className="admin-line-chart-legend">
                  {trendYearLabel && <span className="admin-line-chart-year">{trendYearLabel}</span>}
                  {chartSeries.map((series) => (
                    <span
                      key={series.key}
                      className={`admin-line-chart-legend-item admin-line-chart-legend-${series.colorClassName}`}
                    >
                      {series.label}
                    </span>
                  ))}
                </div>

                <svg
                  className="admin-line-chart-svg"
                  viewBox="0 0 760 260"
                  preserveAspectRatio="none"
                  aria-label="관리자 활동 라인 그래프"
                >
                  {[0, 1, 2, 3, 4].map((row) => {
                    const y = 28 + row * 48;
                    return <line key={`grid-${row}`} x1="36" y1={y} x2="724" y2={y} className="admin-line-chart-grid" />;
                  })}

                  {chartSeries.map((series) => (
                    <g key={series.key}>
                      <path
                        d={buildChartPath(series.points)}
                        className={`admin-line-chart-path admin-line-chart-path-${series.colorClassName}`}
                      />
                      {series.points.map((point, index) => (
                        <circle
                          key={`${series.key}-${index}`}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          className={`admin-line-chart-point admin-line-chart-point-${series.colorClassName}`}
                        />
                      ))}
                    </g>
                  ))}

                  {visibleTrendRows.map((row, index) => {
                    const x = 36 + ((688 / Math.max(visibleTrendRows.length - 1, 1)) * index);
                    return (
                      <text
                        key={`${row.key}-${row.date}`}
                        x={x}
                        y="246"
                        textAnchor="start"
                        className="admin-line-chart-label"
                        transform={`rotate(45 ${x} 246)`}
                      >
                        {formatAxisDateLabel(row.date)}
                      </text>
                    );
                  })}
                </svg>

                <div className="admin-line-chart-summary">
                  {chartSeries.map((series) => (
                    <article key={`summary-${series.key}`} className="admin-line-chart-summary-card">
                      <span>{series.label}</span>
                      <strong>{series.lastValue}</strong>
                      <p>{visibleTrendRows[visibleTrendRows.length - 1]?.date || '-'}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-head">
            <h2>서비스 현황</h2>
            <span>현재 요약값 기준으로 운영 상태를 빠르게 확인합니다.</span>
          </div>
          <div className="admin-activity-grid admin-activity-grid-single">
            <div className="admin-progress-grid">
              {progressMetrics.map((metric) => (
                <article key={metric.label} className={`admin-progress-card admin-progress-card-${metric.tone}`}>
                  <div
                    className="admin-progress-ring"
                    style={{ '--progress': `${Math.max(0, Math.min(metric.value, 100))}%` }}
                  >
                    <div className="admin-progress-ring-inner">
                      <strong>{metric.value}%</strong>
                      <span>{metric.label}</span>
                    </div>
                  </div>
                  <p className="admin-progress-detail">활성/전체: {metric.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="admin-main-grid">
          <section className="admin-section">
            <div className="admin-section-head">
              <h2>사용자 관리</h2>
              <span>총 {usersTotalElements}명</span>
            </div>

            <form
              className="admin-filter-bar"
              onSubmit={(event) => {
                event.preventDefault();
                fetchUsers(0, userFilters);
              }}
            >
              <input
                type="text"
                placeholder="이메일 또는 이름 검색"
                value={userFilters.keyword}
                onChange={(event) => setUserFilters((prev) => ({ ...prev, keyword: event.target.value }))}
              />
              <select
                value={userFilters.status}
                onChange={(event) => setUserFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="">모든 상태</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select
                value={userFilters.role}
                onChange={(event) => setUserFilters((prev) => ({ ...prev, role: event.target.value }))}
              >
                <option value="">모든 권한</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <button type="submit" disabled={isUsersLoading}>검색</button>
            </form>

            <div className="admin-user-list">
              {isUsersLoading ? (
                <p className="admin-empty">사용자 목록을 불러오는 중...</p>
              ) : users.length === 0 ? (
                <p className="admin-empty">조회된 사용자가 없습니다.</p>
              ) : (
                users.map((item) => (
                  <article key={item.id} className="admin-user-card">
                    <div className="admin-user-main">
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.email}</p>
                      </div>
                      <div className="admin-user-badges">
                        <span>{item.role}</span>
                        <span>{item.status}</span>
                        {item.isSuperUser && <span>SUPER</span>}
                      </div>
                    </div>

                    <div className="admin-user-meta">
                      <span>가입일 {formatDateTime(item.createdAt)}</span>
                      <span>최근 로그인 {formatDateTime(item.lastLoginAt)}</span>
                    </div>

                    <div className="admin-user-actions">
                      <button type="button" onClick={() => fetchUserDetail(item.id)} disabled={isMutating || isUserDetailLoading}>
                        상세
                      </button>
                      <button type="button" onClick={() => handleStatusUpdate(item, 'ACTIVE')} disabled={isMutating}>
                        활성
                      </button>
                      <button type="button" onClick={() => handleStatusUpdate(item, 'SUSPENDED')} disabled={isMutating}>
                        정지
                      </button>
                      <button type="button" onClick={() => handleRoleUpdate(item, 'ROLE_USER')} disabled={isMutating}>
                        일반
                      </button>
                      <button type="button" onClick={() => handleRoleUpdate(item, 'ROLE_ADMIN')} disabled={isMutating}>
                        관리자
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="admin-pagination">
              <button type="button" onClick={() => fetchUsers(Math.max(0, usersPage - 1), userFilters)} disabled={usersPage <= 0 || isUsersLoading}>
                이전
              </button>
              <span>{usersPage + 1} / {Math.max(usersTotalPages, 1)}</span>
              <button
                type="button"
                onClick={() => fetchUsers(Math.min(usersTotalPages - 1, usersPage + 1), userFilters)}
                disabled={usersTotalPages === 0 || usersPage >= usersTotalPages - 1 || isUsersLoading}
              >
                다음
              </button>
            </div>
          </section>

          <aside className="admin-side-column">
            <section className="admin-section">
              <div className="admin-section-head">
                <h2>사용자 상세</h2>
                {isUserDetailLoading && <span>불러오는 중...</span>}
              </div>
              {!selectedUserDetail ? (
                <p className="admin-empty">사용자 상세를 보려면 목록에서 상세를 누르세요.</p>
              ) : (
                <dl className="admin-detail-grid">
                  <div><dt>ID</dt><dd>{selectedUserDetail.id}</dd></div>
                  <div><dt>Email</dt><dd>{selectedUserDetail.email}</dd></div>
                  <div><dt>이름</dt><dd>{selectedUserDetail.name}</dd></div>
                  <div><dt>권한</dt><dd>{selectedUserDetail.role}</dd></div>
                  <div><dt>상태</dt><dd>{selectedUserDetail.status}</dd></div>
                  <div><dt>Super Admin</dt><dd>{selectedUserDetail.isSuperUser ? '예' : '아니오'}</dd></div>
                  <div><dt>Provider</dt><dd>{selectedUserDetail.provider || '-'}</dd></div>
                  <div><dt>실패 로그인</dt><dd>{selectedUserDetail.failedLoginAttempts ?? 0}</dd></div>
                  <div><dt>잠금 해제 시각</dt><dd>{formatDateTime(selectedUserDetail.accountLockedUntil)}</dd></div>
                  <div><dt>최근 로그인 IP</dt><dd>{selectedUserDetail.lastLoginIp || '-'}</dd></div>
                  <div><dt>최근 로그인</dt><dd>{formatDateTime(selectedUserDetail.lastLoginAt)}</dd></div>
                  <div><dt>이메일 인증</dt><dd>{formatDateTime(selectedUserDetail.emailVerifiedAt)}</dd></div>
                </dl>
              )}
            </section>

            <section className="admin-section">
              <div className="admin-section-head">
                <h2>강제 삭제</h2>
              </div>
              <form className="admin-moderation-form" onSubmit={handleModerationSubmit}>
                <div className="admin-segmented">
                  <button
                    type="button"
                    className={moderationTarget === 'post' ? 'active' : ''}
                    onClick={() => setModerationTarget('post')}
                  >
                    게시물
                  </button>
                  <button
                    type="button"
                    className={moderationTarget === 'comment' ? 'active' : ''}
                    onClick={() => setModerationTarget('comment')}
                  >
                    댓글
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder={`${moderationTarget === 'post' ? '게시물' : '댓글'} ID`}
                  value={moderationTargetId}
                  onChange={(event) => setModerationTargetId(event.target.value)}
                />
                <textarea
                  placeholder="강제 삭제 사유"
                  value={moderationReason}
                  onChange={(event) => setModerationReason(event.target.value)}
                  maxLength={500}
                />
                <button type="submit" disabled={isMutating}>
                  {isMutating ? '처리 중...' : '강제 삭제 실행'}
                </button>
              </form>
            </section>
          </aside>
        </div>

        <section className="admin-section">
          <div className="admin-section-head">
            <h2>감사 로그</h2>
            {isAuditLoading && <span>불러오는 중...</span>}
          </div>
          <div className="admin-audit-list">
            {auditLogs.length === 0 ? (
              <p className="admin-empty">감사 로그가 없습니다.</p>
            ) : (
              auditLogs.map((log) => (
                <article key={log.id} className="admin-audit-card">
                  <div className="admin-audit-top">
                    <strong>{log.actionType}</strong>
                    <span>{formatDateTime(log.createdAt)}</span>
                  </div>
                  <p>관리자 #{log.adminUserId}가 {log.targetType} #{log.targetId}에 작업했습니다.</p>
                  {log.reason && <p className="admin-audit-reason">사유: {log.reason}</p>}
                  <div className="admin-audit-payloads">
                    <pre>{log.beforeData || 'beforeData 없음'}</pre>
                    <pre>{log.afterData || 'afterData 없음'}</pre>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="admin-pagination">
            <button type="button" onClick={() => fetchAuditLogs(Math.max(0, auditPage - 1))} disabled={auditPage <= 0 || isAuditLoading}>
              이전
            </button>
            <span>{auditPage + 1} / {Math.max(auditTotalPages, 1)}</span>
            <button
              type="button"
              onClick={() => fetchAuditLogs(Math.min(auditTotalPages - 1, auditPage + 1))}
              disabled={auditTotalPages === 0 || auditPage >= auditTotalPages - 1 || isAuditLoading}
            >
              다음
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default Admin;
