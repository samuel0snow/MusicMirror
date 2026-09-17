// A local diagnostic page for the first account test, not the product GUI.
export const realAccountPage = `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MusicMirror · 首次真实账号测试</title>
<style>body{font:16px/1.65 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#20272e}button{font:inherit;padding:8px 18px;margin:8px 8px 8px 0;cursor:pointer}img{display:block;width:260px;height:260px;image-rendering:pixelated}pre{white-space:pre-wrap;background:#f4f6f8;padding:16px;border-radius:8px}small{color:#56616b}</style>
<h1>MusicMirror · 真实账号测试</h1>
<p>用网易云音乐 App 扫码并确认。登录后只读取听歌和收藏数据进行首次分析，不修改歌单。</p>
<button id="login">生成登录二维码</button><button id="analyze" disabled>重新读取并分析</button><button id="logout" disabled>退出测试会话</button>
<p id="status" role="status">准备连接本地服务。</p><img id="qr" alt="网易云音乐登录二维码" hidden>
<small>二维码两分钟过期。Cookie保存在本机服务端；本页只保存自有会话。近期收藏时间未验证时不会冒充“一周内”。</small>
<h2>测试结果</h2><pre id="result">尚未登录。</pre>
<script>
const el=id=>document.getElementById(id);
let token=sessionStorage.getItem('musicmirror.test.session')||'', attempt=null, generation=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(path,method='GET',body){
 const response=await fetch(path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
 const value=await response.json();if(!response.ok)throw new Error(value.error?.message||'请求失败');return value;
}
function state(text){el('status').textContent=text;}
function show(report){el('result').textContent=JSON.stringify({
 dataWindow:report.dataWindow, facts:report.facts, indexes:report.indexes, confidence:report.confidence,
 recentFavorites:{status:report.modules.recentFavorites.status,sampleSize:report.modules.recentFavorites.sampleSize,timeWindow:report.modules.recentFavorites.timeWindow,warnings:report.modules.recentFavorites.warnings},
 warnings:report.warnings
},null,2);}
async function analyze(){
 el('analyze').disabled=true;state('已登录，正在读取真实数据并生成分析…');
 try{const created=await api('/analysis/refresh','POST',{});const until=Date.now()+180000;
 while(Date.now()<until){const run=await api('/analysis/runs/'+created.runId);
 if(run.status==='completed'){show(await api('/analysis/snapshot/'+run.snapshotId));state('真实账号采集完成。请查看数据可用性与缺失项。');return;}
 if(run.status==='failed'||run.status==='cancelled')throw new Error(run.error?.message||'任务已取消');await sleep(1000);}
 state('后台任务仍在运行，可稍后查看。');
 }catch(error){state(error.message);}finally{el('analyze').disabled=false;}
}
el('login').onclick=async()=>{
 const current=++generation;el('login').disabled=true;el('qr').hidden=true;state('正在生成二维码…');
 try{if(attempt)await api('/auth/qr/cancel','POST',{loginId:attempt.loginId,pollToken:attempt.pollToken});
 attempt=await api('/auth/qr','POST',{});el('qr').src=attempt.qrImage;el('qr').hidden=false;state('请用网易云音乐 App 扫码并确认登录。');
 while(current===generation){await sleep(attempt.pollIntervalMs);const result=await api('/auth/qr/check','POST',{loginId:attempt.loginId,pollToken:attempt.pollToken});
 if(result.status==='expired'){el('qr').hidden=true;state('二维码已过期，请重新生成。');return;}
 if(result.status==='scanned')state('已扫码，请在手机上确认。');
 if(result.status==='authenticated'){token=result.token;sessionStorage.setItem('musicmirror.test.session',token);attempt=null;el('qr').hidden=true;el('logout').disabled=false;el('analyze').disabled=false;await analyze();return;}
 }
 }catch(error){state(error.message);}finally{el('login').disabled=false;}
};
el('analyze').onclick=analyze;
el('logout').onclick=async()=>{try{await api('/auth/logout','POST',{});token='';sessionStorage.removeItem('musicmirror.test.session');el('analyze').disabled=true;el('logout').disabled=true;el('result').textContent='已退出。';state('会话已撤销，报告仍保留在本机。');}catch(error){state(error.message);}};
api('/health').then(async health=>{state('本地服务已连接：'+health.providerMode);if(token){try{await api('/auth/me');el('analyze').disabled=false;el('logout').disabled=false;show(await api('/analysis/latest'));}catch{state('请扫码登录或首次生成报告。');}}}).catch(error=>state(error.message));
</script></html>`;
