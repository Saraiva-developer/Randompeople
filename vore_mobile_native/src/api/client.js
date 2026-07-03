import Constants from 'expo-constants';

function inferExpoHost() {
  const candidates = [
    Constants?.expoConfig?.hostUri,
    Constants?.manifest?.debuggerHost,
    Constants?.manifest2?.extra?.expoGo?.debuggerHost,
  ];
  for (const item of candidates) {
    if (!item || typeof item !== 'string') continue;
    const host = item.split(':')[0];
    if (host) return host;
  }
  return '';
}

const ENV_BASE = process.env.EXPO_PUBLIC_API_BASE;
const expoHost = inferExpoHost();
const AUTO_BASE = expoHost ? `http://${expoHost}/vore/api` : '';
const RAW_BASE = ENV_BASE || AUTO_BASE || 'http://localhost/vore/api';
export const API_BASE = String(RAW_BASE || '').replace(/\/+$/, '');
export function getApiBase() {
  return API_BASE;
}

async function request(path, options = {}) {
  const url = `${API_BASE}/${String(path || '').replace(/^\/+/, '')}`;
  const method = options.method || 'GET';
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  let body = options.body;

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      credentials: 'include',
    });
  } catch (_e) {
    throw new Error(`Network request failed (${url})`);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_e) {
    data = null;
  }

  if (!res.ok || (data && data.ok === false)) {
    const message =
      (data && (data.error || data.message)) ||
      `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data || { ok: true };
}

export function authMe() {
  return request('auth/me.php');
}

export function authLogin(email, password) {
  return request('auth/login.php', {
    method: 'POST',
    body: { email, password },
  });
}

export function authRegister(name, email, password, accountType = 'professional') {
  return request('auth/register.php', {
    method: 'POST',
    body: { name, email, password, account_type: accountType },
  });
}

export function authLogout() {
  return request('auth/logout.php', { method: 'POST' });
}

export function profilesFeed(limit = 120) {
  return request(`profiles/feed.php?limit=${Number(limit) || 120}`);
}

export function profileMe() {
  return request('profiles/me.php');
}

export function profileUpdate(payload) {
  return request('profiles/me.php', {
    method: 'PUT',
    body: payload,
  });
}

export function profileCreate(payload) {
  return request('profiles/create.php', {
    method: 'POST',
    body: payload,
  });
}

export function recommendationsMe() {
  return request('recommendations/me.php');
}

export function recommendationsSearchUsers(query) {
  const q = encodeURIComponent(String(query || '').trim());
  return request(`recommendations/users.php?q=${q}`);
}

export function recommendationsSend(payload) {
  return request('recommendations/send.php', {
    method: 'POST',
    body: payload,
  });
}

export function recommendationsReact(recommendationId, reaction) {
  return request('recommendations/react.php', {
    method: 'POST',
    body: {
      recommendation_id: recommendationId,
      reaction,
    },
  });
}

export function recommendationsPermissionAction(payload) {
  return request('recommendations/permissions.php', {
    method: 'POST',
    body: payload,
  });
}

export function profileReviewsList({ profileId, slug } = {}) {
  const params = new URLSearchParams();
  if (Number(profileId) > 0) params.set('profile_id', String(Number(profileId)));
  if (String(slug || '').trim()) params.set('slug', String(slug).trim());
  const query = params.toString();
  return request(`reviews/list.php${query ? `?${query}` : ''}`);
}

export function profileReviewsUpsert({ profileId, slug, rating, comment } = {}) {
  return request('reviews/upsert.php', {
    method: 'POST',
    body: {
      profile_id: Number(profileId) > 0 ? Number(profileId) : null,
      slug: String(slug || '').trim() || null,
      rating,
      comment,
    },
  });
}
