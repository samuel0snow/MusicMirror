'use strict';
// WeChat DevTools simulator -> the API started by `npm run dev`.
// A physical phone cannot use 127.0.0.1; see docs/local-api-and-cloud-migration.md.
const defaultBaseUrl = 'http://127.0.0.1:3000';

function getBaseUrl(wxApi) {
  // A local override avoids editing tracked source when switching to a LAN/tunnel
  // address. Clear it with: wx.removeStorageSync('musicmirror.apiBaseUrl')
  const override = wxApi && wxApi.getStorageSync('musicmirror.apiBaseUrl');
  return typeof override === 'string' && /^https?:\/\/[^\s]+$/.test(override)
    ? override.replace(/\/$/, '')
    : defaultBaseUrl;
}

module.exports = { defaultBaseUrl, getBaseUrl };
