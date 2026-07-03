import { API_BASE } from '../config.js';

async function request(path, options = {}) {
  const cleanPath = String(path || '').replace(/^\/+/, '').replace(/\.php(?=$|\?)/, '');
  const url = API_BASE + '/' + cleanPath;
  const method = options.method || 'GET';
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, { method, headers, body, credentials: 'include' });
  } catch (_e) {
    throw new Error('Network request failed (' + url + ')');
  }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok || (data && data.ok === false)) {
    throw new Error((data && (data.error || data.message)) || ('HTTP ' + res.status));
  }
  return data || { ok: true };
}

export const api = {
  authMe: () => request('auth/me.php'),
  authLogin: (email, password) => request('auth/login.php', { method: 'POST', body: { email, password } }),
  authRegister: (name, email, password, accountType = 'professional') => request('auth/register.php', { method: 'POST', body: { name, email, password, account_type: accountType } }),
  authLogout: () => request('auth/logout.php', { method: 'POST' }),
  authForgotPassword: (email) => request('auth/forgot-password.php', { method: 'POST', body: { email } }),
  authResetPassword: (token, password) => request('auth/reset-password.php', { method: 'POST', body: { token, password } }),
  mediaUpload: (file, context = 'media') => {
    const form = new FormData();
    form.append('file', file);
    form.append('context', String(context || 'media'));
    return request('media/upload.php', { method: 'POST', body: form });
  },
  profilesFeed: (limit = 120) => request('profiles/feed.php?limit=' + (Number(limit) || 120)),
  profilePublic: (slug) => request('profiles/public.php?slug=' + encodeURIComponent(String(slug || '').trim())),
  profileCreate: (payload) => request('profiles/create.php', { method: 'POST', body: payload }),
  profileUpdate: (payload) => request('profiles/me.php', { method: 'PUT', body: payload }),
  profileReviewsList: ({ profileId, slug } = {}) => {
    const params = new URLSearchParams();
    if (Number(profileId) > 0) params.set('profile_id', String(Number(profileId)));
    if (slug) params.set('slug', String(slug));
    const query = params.toString();
    return request(`reviews/list.php${query ? `?${query}` : ''}`);
  },
  profileReviewsUpsert: ({ profileId, slug, rating, comment } = {}) =>
    request('reviews/upsert.php', {
      method: 'POST',
      body: {
        profile_id: Number(profileId) > 0 ? Number(profileId) : null,
        slug: slug || null,
        rating,
        comment,
      },
    }),
  recommendationsMe: () => request('recommendations/me.php'),
  recommendationsUsers: (query = '') => request('recommendations/users.php?q=' + encodeURIComponent(String(query || '').trim())),
  recommendationsSend: (payload) => request('recommendations/send.php', { method: 'POST', body: payload }),
  recommendationsReact: (recommendationId, reaction) =>
    request('recommendations/react.php', {
      method: 'POST',
      body: {
        recommendation_id: Number(recommendationId) > 0 ? Number(recommendationId) : 0,
        reaction: String(reaction || '').trim().toLowerCase(),
      },
    }),
  recommendationsPermissionAction: (payload) =>
    request('recommendations/permissions.php', {
      method: 'POST',
      body: payload,
    }),
  savedProfilesGet: () => request('saved/me.php'),
  savedProfileSet: (profileId, saved = true) =>
    request('saved/me.php', {
      method: 'POST',
      body: {
        profile_id: String(profileId || ''),
        saved: !!saved,
      },
    }),
  savedEntrySet: (kind, key, entry, saved = true) =>
    request('saved/me.php', {
      method: 'POST',
      body: {
        kind: String(kind || '').trim().toLowerCase(),
        key: String(key || ''),
        entry: entry && typeof entry === 'object' ? entry : {},
        saved: !!saved,
      },
    }),
};
