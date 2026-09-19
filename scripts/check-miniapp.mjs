import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=resolve('apps/miniapp/miniprogram');
const config=JSON.parse(readFileSync(join(root,'app.json'),'utf8'));
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const files=walk(root);
for(const page of config.pages)for(const suffix of ['.js','.json','.wxml','.wxss'])if(!existsSync(join(root,page+suffix)))throw new Error(`Missing page file ${page+suffix}`);
for(const component of Object.values(config.usingComponents))for(const suffix of ['.js','.json','.wxml','.wxss'])if(!existsSync(join(root,component.slice(1)+suffix)))throw new Error(`Missing component ${component+suffix}`);
for(const file of files.filter(f=>f.endsWith('.json')))JSON.parse(readFileSync(file,'utf8'));
for(const file of files.filter(f=>f.endsWith('.js'))){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);}
const ide=process.env.WECHAT_DEVTOOLS_PATH;
const candidates=[ide,'D:/Program Files/微信web开发者工具','C:/Program Files (x86)/Tencent/微信web开发者工具'].filter(Boolean);
const tools=candidates.map(p=>join(p,'resources/app.asar.unpacked/node_modules/wcc-exec')).find(p=>existsSync(join(p,'wcc.exe')));
if(!tools)throw new Error('Set WECHAT_DEVTOOLS_PATH to an installed WeChat developer tools directory to run native WXML/WXSS compilation.');
mkdirSync('.data/miniapp-check',{recursive:true});
for(const [exe,ext,out] of [['wcc.exe','.wxml','wxml.js'],['wcsc.exe','.wxss','wxss.js']]){
 const input=files.filter(f=>f.endsWith(ext));
 const result=spawnSync(join(tools,exe),['-o',resolve('.data/miniapp-check',out),...input],{encoding:'utf8'});
 if(result.status!==0)throw new Error(result.stderr||result.stdout||`${exe} failed`);
 console.log(`${exe}: compiled ${input.length} ${ext} files`);
}
console.log(`Miniapp manifest, ${config.pages.length} native pages, component files and JavaScript syntax passed.`);
