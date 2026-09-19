'use strict';
const {createPage}=require('../../services/page');
const view=require('../../services/presenter');
Page(createPage({data:{result:null,facts:[],from:'',to:'',artistChanges:[]},async load(alive){const r=await this.client.compare(this.query.from,this.query.to);if(alive())this.setData({result:r,facts:r.aesthetic?view.flatten(r.aesthetic):view.flatten(r.indexDeltas),artistChanges:r.artistShareChanges.map(x=>({...x,beforeText:view.pct(x.before),afterText:view.pct(x.after),deltaText:(x.delta*100).toFixed(1)+' 个百分点'})),from:this.query.from,to:this.query.to});}}));
