'use strict';
const { createClient } = require('./services/client');
const config = require('./config');
App({
  globalData: { account: null, theme: 'light' },
  onLaunch() {
    this.client = createClient({ wx, baseUrl: config.getBaseUrl(wx) });
    this.globalData.theme = (wx.getAppBaseInfo ? wx.getAppBaseInfo() : wx.getSystemInfoSync()).theme || 'light';
    if (wx.onThemeChange) wx.onThemeChange(event => {
      this.globalData.theme = event.theme;
      getCurrentPages().forEach(page => { if (page.applyTheme) page.applyTheme(); });
    });
  },
  theme() { const preference = wx.getStorageSync('musicmirror.theme') || 'system'; return preference === 'system' ? this.globalData.theme : preference; },
  clearSession() {
    this.client.clearToken(); this.globalData.account = null;
    wx.removeStorageSync('musicmirror.run');
  }
});
