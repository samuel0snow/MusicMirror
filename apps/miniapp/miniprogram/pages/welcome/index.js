'use strict';
const {createPage}=require('../../services/page');
Page(createPage({public:true,data:{demoAvailable:false,hasSession:false},async load(alive){this.setData({hasSession:this.client.hasSession()});const health=await this.client.health();if(alive())this.setData({demoAvailable:health.demoAvailable});},methods:{demo(){return this.perform(async alive=>{await this.client.loginDemo();if(alive())wx.switchTab({url:'/pages/home/index'});});},resume(){wx.switchTab({url:'/pages/home/index'});}}}));
