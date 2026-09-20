import { useEffect, useMemo } from 'react';
import { BottomTabs } from './components/BottomTabs.js';
import { PhoneFrame } from './components/PhoneFrame.js';
import { PreviewControls } from './components/PreviewControls.js';
import { PageView } from './pages/Pages.js';
import { usePreview } from './preview/PreviewContext.js';
import { PAGE_BY_ID, parseHash, toHash, type PageId } from './preview/routes.js';
import { PAGE_DEFAULT_SCENARIO } from './preview/scenarios.js';

export function App() {
  const {state,dispatch}=usePreview();
  useEffect(()=>{const sync=()=>{const parsed=parseHash(window.location.hash);const id=parsed.id??'welcome';const query=Object.fromEntries(parsed.params);dispatch({type:'ROUTE',route:id,query});dispatch({type:'SCENARIO',scenarioId:PAGE_DEFAULT_SCENARIO[id]});if(!parsed.id)window.location.hash=toHash('welcome');};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[dispatch]);
  useEffect(()=>{localStorage.setItem('musicmirror.preview.theme',state.themeChoice)},[state.themeChoice]);
  const resolved=useMemo(()=>state.themeChoice==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):state.themeChoice,[state.themeChoice]);
  const page=(PAGE_BY_ID[state.route as PageId]?state.route:'welcome') as PageId;
  const go=(id:PageId,query?:Record<string,string>)=>{window.location.hash=toHash(id,query)};
  return <div className="preview-app" data-theme={resolved}><PreviewControls/><div className="preview-stage"><PhoneFrame><div className="product-screen"><div className="product-scroll"><PageView page={page} go={go}/></div>{PAGE_BY_ID[page].tab&&<BottomTabs currentPage={page} onNavigate={go}/>}</div></PhoneFrame><p className="stage-note">390 × 844 · 浏览器交互预览 · 全部数据为合成示例</p></div>{state.toast&&<div className={`toast ${state.toast.tone}`} role="status"><span>{state.toast.message}</span><button onClick={()=>dispatch({type:'DISMISS_TOAST'})} aria-label="关闭提示">×</button></div>}</div>;
}
