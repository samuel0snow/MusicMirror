'use strict';
const {createPage}=require('../../services/page');
const view=require('../../services/presenter');
Page(createPage({
  public:true,
  data:{consented:false,status:'idle',qrImage:'',expiry:'',help:false,providerMode:'',demoAvailable:false},
  stop(){clearTimeout(this.qrTimer);const attempt=this.attempt;this.attempt=null;if(attempt)this.client.cancelQr(attempt).catch(()=>{});},
  async load(alive){
    if(this.data.status==='waiting'||this.data.status==='scanned')this.setData({status:'expired',qrImage:''});
    const health=await this.client.health();
    if(alive())this.setData({providerMode:health.providerMode,demoAvailable:health.demoAvailable});
  },
  methods:{
    consent(e){this.setData({consented:e.detail.value.length>0});},
    help(){this.setData({help:!this.data.help});},
    demo(){return this.perform(async alive=>{await this.client.loginDemo();if(alive())wx.redirectTo({url:'/pages/inputs/index'});});},
    async start(){return this.perform(async alive=>{if(this.data.providerMode!=='netease')throw new Error('当前是本地演示数据源，请使用演示模式');if(!this.data.consented)throw new Error('请先阅读并同意本次数据使用说明');clearTimeout(this.qrTimer);if(this.attempt)await this.client.cancelQr(this.attempt);this.attempt=null;const attempt=await this.client.createQr();if(!alive()){await this.client.cancelQr(attempt);return;}this.attempt=attempt;this.setData({status:'waiting',qrImage:attempt.qrImage,expiry:view.date(attempt.expiresAt)});this.schedule();});},
    schedule(){clearTimeout(this.qrTimer);if(!this.attempt||!this.visible)return;this.qrTimer=setTimeout(()=>this.poll(),Math.max(1500,this.attempt.pollIntervalMs||2000));},
    async poll(){const attempt=this.attempt,version=this.epoch;if(!attempt||!this.visible)return;if(this.data.busy){this.schedule();return;}if(Date.now()>=Date.parse(attempt.expiresAt)){this.setData({status:'expired',qrImage:''});this.client.cancelQr(attempt).catch(()=>{});this.attempt=null;return;}try{const result=await this.client.checkQr(attempt,()=>this.visible&&this.epoch===version&&this.attempt===attempt);if(!this.visible||this.epoch!==version)return;if(result.status==='authenticated'){this.attempt=null;this.app.globalData.account=result.account;wx.redirectTo({url:'/pages/inputs/index'});return;}this.setData({status:result.status});if(result.status==='expired'){this.attempt=null;this.setData({qrImage:''});}else this.schedule();}catch(e){if(this.visible&&this.epoch===version)this.setData({error:{code:e.code,message:e.message}});}},
    retry(){if(this.attempt){this.setData({error:null});return this.poll();}return this.data.providerMode==='netease'?this.start():this.onShow();},
    cancel(){clearTimeout(this.qrTimer);if(this.attempt)this.client.cancelQr(this.attempt).catch(()=>{});this.attempt=null;wx.reLaunch({url:'/pages/welcome/index'});}
  }
}));
