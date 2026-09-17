'use strict';

/** Native WeChat transport. No Node APIs or cross-miniprogram imports. */
function createClient(options) {
  const wxApi = options.wx;
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  if (!/^https?:\/\//.test(baseUrl)) throw new Error('API baseUrl must use HTTP(S)');
  const tokenKey = options.tokenKey || 'musicmirror.session';
  const timeout = options.timeoutMs || 15000;
  const getToken = () => wxApi.getStorageSync(tokenKey) || '';
  const clearToken = () => wxApi.removeStorageSync(tokenKey);
  function apiError(code, message, statusCode) {
    const error = new Error(message);
    error.code = code; error.statusCode = statusCode || 0;
    return error;
  }
  function request(method, path, data) {
    return new Promise((resolve, reject) => {
      const token = getToken();
      wxApi.request({
        url: baseUrl + path, method, data, timeout,
        header: Object.assign({}, data !== undefined ? { 'content-type': 'application/json' } : {}, token ? { Authorization: 'Bearer ' + token } : {}),
        success(response) {
          if (response.statusCode >= 200 && response.statusCode < 300) { resolve(response.data); return; }
          const error = response.data && response.data.error;
          if (response.statusCode === 401 && (!error || error.code === 'UNAUTHORIZED')) clearToken();
          reject(apiError(error && error.code || 'HTTP_ERROR', error && error.message || '请求失败，请稍后重试', response.statusCode));
        },
        fail() { reject(apiError('NETWORK_ERROR', '无法连接服务，请检查网络和API地址')); }
      });
    });
  }
  async function login(path, body) {
    const result = await request('POST', path, body);
    wxApi.setStorageSync(tokenKey, result.token);
    return result.account;
  }
  const encode = value => encodeURIComponent(String(value));
  const client = {
    health: () => request('GET', '/health'),
    loginDemo: () => login('/auth/demo', {}),
    connect: cookie => login('/auth/connect', { cookie }),
    createQr: () => request('POST', '/auth/qr', {}),
    async checkQr(attempt) {
      const result = await request('POST', '/auth/qr/check', { loginId: attempt.loginId, pollToken: attempt.pollToken });
      if (result.status === 'authenticated') wxApi.setStorageSync(tokenKey, result.token);
      return result;
    },
    cancelQr: attempt => request('POST', '/auth/qr/cancel', { loginId: attempt.loginId, pollToken: attempt.pollToken }),
    me: () => request('GET', '/auth/me'),
    async logout() { await request('POST', '/auth/logout', {}); clearToken(); },
    unbind: () => request('DELETE', '/auth/binding'),
    async deleteData() { await request('DELETE', '/account/data'); clearToken(); },
    favoriteInput: () => request('GET', '/inputs/recent-favorites'),
    saveFavoriteInput: items => request('PUT', '/inputs/recent-favorites', { items }),
    refresh: key => request('POST', '/analysis/refresh', key ? { idempotencyKey: key } : {}),
    run: id => request('GET', '/analysis/runs/' + encode(id)),
    latest: () => request('GET', '/analysis/latest'),
    snapshot: id => request('GET', '/analysis/snapshot/' + encode(id)),
    longTerm: () => request('GET', '/analysis/modules/long-term'),
    recentFavorites: () => request('GET', '/analysis/modules/recent-favorites'),
    structure: () => request('GET', '/analysis/structure'),
    preferences: () => request('GET', '/analysis/preferences'),
    metric: key => request('GET', '/analysis/metric/' + encode(key)),
    history: (limit, offset) => request('GET', '/analysis/history?limit=' + encode(limit || 20) + '&offset=' + encode(offset || 0)),
    compare: (from, to) => request('GET', '/analysis/compare?from=' + encode(from) + '&to=' + encode(to)),
    trends: days => request('GET', '/analysis/trends?days=' + encode(days || 'all')),
    async waitForRun(id, waitOptions) {
      const opts = waitOptions || {};
      const until = Date.now() + (opts.timeoutMs || 120000);
      const cancelled = () => opts.cancellation && opts.cancellation.cancelled;
      while (Date.now() < until) {
        if (cancelled()) throw apiError('POLLING_CANCELLED', '已停止等待，后台任务状态可稍后查看');
        const run = await client.run(id);
        if (cancelled()) throw apiError('POLLING_CANCELLED', '已停止等待');
        if (opts.onProgress) opts.onProgress(run);
        if (run.status === 'completed') return run;
        if (run.status === 'failed') throw apiError(run.error && run.error.code || 'ANALYSIS_FAILED', run.error && run.error.message || '分析失败');
        if (run.status === 'cancelled') throw apiError('ANALYSIS_CANCELLED', '分析任务已取消');
        await new Promise(resolve => setTimeout(resolve, opts.intervalMs || options.pollIntervalMs || 800));
      }
      throw apiError('POLLING_TIMEOUT', '分析仍可能在运行，可继续查询任务进度');
    },
    clearToken
  };
  return client;
}
module.exports = { createClient };
