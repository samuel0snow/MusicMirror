'use strict';
function createPage(spec) {
  const definition = {
    data: Object.assign({ theme: 'light', busy: false, error: null, account: null }, spec.data),
    onLoad(query) { this.query = query || {}; this.app = getApp(); this.client = this.app.client; this.epoch = 0; this.visible = false; },
    onShow() { if(this.data.busy&&this.visible)return Promise.resolve(null); this.visible = true; this.epoch++; this.applyTheme(); return this.perform(async alive => {
      if (!spec.public) {
        if (!this.client.hasSession()) { wx.reLaunch({url:'/pages/welcome/index'}); return; }
        const state = await this.client.me(); if(!alive())return;
        if(this.data.account&&this.data.account.userId!==state.account.userId){this.setData(JSON.parse(JSON.stringify(spec.data||{})));this.dirty=false;}
        this.app.globalData.account = state.account; this.setData(state);
      }
      if (spec.load) return spec.load.call(this,alive);
    }); },
    applyTheme() {
      const theme = this.app.theme(); this.setData({ theme });
      wx.setNavigationBarColor({frontColor:theme==='dark'?'#ffffff':'#000000',backgroundColor:theme==='dark'?'#111629':'#f9fafe'});
      if (wx.setTabBarStyle) wx.setTabBarStyle({color:theme==='dark'?'#b9bed3':'#626980',selectedColor:theme==='dark'?'#c4b1ff':'#6550b9',backgroundColor:theme==='dark'?'#20263d':'#ffffff',borderStyle:theme==='dark'?'black':'white'});
    },
    onHide() { this.visible = false; this.epoch++; this.setData({busy:false}); if (spec.stop) spec.stop.call(this); },
    onUnload() { this.visible = false; this.epoch++; if (spec.stop) spec.stop.call(this); },
    async perform(work) {
      if (this.data.busy) return null;
      const version = this.epoch; this.setData({busy:true,error:null});
      try { return await work.call(this, () => this.visible && this.epoch === version); }
      catch (e) {
        if (this.visible && this.epoch === version) {
          this.setData({error:{code:e.code||'CLIENT_ERROR',message:e.message||'操作失败，请重试'}});
          if (e.code==='UNAUTHORIZED') { this.app.clearSession(); wx.reLaunch({url:'/pages/welcome/index'}); }
        }
        return null;
      } finally { if (this.visible && this.epoch===version) this.setData({busy:false}); }
    },
    retry() { return this.onShow(); },
    go(event) { const target=event.currentTarget.dataset; if(target.tab)wx.switchTab({url:target.url});else wx.navigateTo({url:target.url}); },
    back() { if(getCurrentPages().length>1)wx.navigateBack();else wx.switchTab({url:'/pages/home/index'}); },
    async confirm(title, content) { return new Promise(resolve=>wx.showModal({title,content,confirmText:'确认',cancelText:'取消',success:r=>resolve(r.confirm),fail:()=>resolve(false)})); },
    toast(title) { wx.showToast({title,icon:'none'}); },
    onPullDownRefresh() { return this.onShow().finally(()=>wx.stopPullDownRefresh()); }
  };
  return Object.assign(definition,spec.methods||{});
}
module.exports={createPage};
