'use strict';
const {createPage}=require('../../services/page');
const view=require('../../services/presenter');
Page(createPage({data:{report:null,empty:false,hasRun:false},async load(alive){const stored=wx.getStorageSync('musicmirror.run');this.setData({hasRun:!!stored&&stored.userId===this.data.account.userId});try{const s=await this.client.latest();if(alive())this.setData({report:view.overview(s),empty:false});}catch(e){if(e.code==='NO_SNAPSHOT'){if(alive())this.setData({empty:true,report:null});}else throw e;}}}));
