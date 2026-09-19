'use strict';
const {createPage}=require('../../services/page');
const view=require('../../services/presenter');
Page(createPage({data:{days:'30',result:null,points:[],facts:[]},async load(alive){return this.fetchTrends(alive);},methods:{async fetchTrends(alive){const r=await this.client.trends(this.data.days);if(alive())this.setData({result:r,points:(r.aesthetic?r.aesthetic.points:r.points).map(s=>({...s,date:view.date(s.createdAt)})),facts:view.flatten(r.aesthetic&&r.aesthetic.adjacent||[])});},window(e){this.setData({days:e.currentTarget.dataset.days});return this.perform(this.fetchTrends);}}}));
