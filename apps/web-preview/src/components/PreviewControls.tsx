import { PAGE_ROUTES } from '../preview/routes.js';
import { PAGE_SCENARIOS, type Scenario } from '../preview/scenarios.js';
import { usePreview } from '../preview/PreviewContext';
import type { ThemeChoice } from '../types.js';

export function PreviewControls() {
  const { state, dispatch } = usePreview();

  const pages = PAGE_ROUTES;
  const scenarios = PAGE_SCENARIOS[state.route as keyof typeof PAGE_SCENARIOS] ?? [];

  const gotoPage = (route: string) => {
    if (route === 'welcome') {
      dispatch({ type: 'RESET' });
      window.location.hash = '/welcome';
    } else {
      window.location.hash = `/${route}`;
    }
  };

  const selectScenario = (scenarioId: string) => dispatch({ type: 'SCENARIO', scenarioId });

  const toggleFailNext = (checked: boolean) => dispatch({ type: 'FAIL_NEXT', enabled: checked });

  const onThemeChange = (value: string) => dispatch({ type: 'THEME', themeChoice: value as ThemeChoice });

  return (
    <aside className="preview-controls" data-testid="preview-controls">
      <div className="preview-controls-head">
        <span className="preview-kicker">PREVIEW</span>
        <h2>演示控制</h2>
        <p className="preview-caption">页面试图与场景由固定 fixture 驱动，不会请求真实服务。</p>
      </div>

      <section className="control-block">
        <h3>页面</h3>
        <select
          data-testid="preview-page-select"
          aria-label="选择页面"
          value={state.route}
          onChange={(event) => gotoPage(event.target.value)}
        >
          {pages.map((page) => (
            <option key={page.id} value={page.path}>
              {page.label}
            </option>
          ))}
        </select>
      </section>

      <section className="control-block">
        <h3>场景</h3>
        <div className="scene-list">
          {scenarios.length === 0 && <p className="muted">此页面没有额外的场景。</p>}
          {scenarios.map((scenario: Scenario) => (
            <div
              key={scenario.id}
              data-testid={`preview-scenario-${scenario.id}`}
              className={
                'scene-item' + (state.scenarioId === scenario.id ? ' selected' : '')
              }
            >
              <button
                type="button"
                className="scene-choice"
                onClick={() => selectScenario(scenario.id)}
              >
                <span className="scene-label">{scenario.label}</span>
                <span className="scene-hint">{scenario.hint}</span>
              </button>
              <p className="scene-output" data-testid="scene-output">
                {scenario.expectedOutput}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="control-block">
        <h3>主题</h3>
        <select
          data-testid="preview-theme-select"
          aria-label="选择主题"
          value={state.themeChoice}
          onChange={(event) => onThemeChange(event.target.value)}
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </section>

      <section className="control-block">
        <h3>故障注入</h3>
        <label className="check-line">
          <input
            type="checkbox"
            checked={state.nextActionFails}
            onChange={(event) => toggleFailNext(event.target.checked)}
            data-testid="preview-failnext"
          />
          <span>下一次操作失败</span>
        </label>
        <p className="muted">打开后，登录、刷新、导出等操作的下一步将进入错误状态。</p>
      </section>

      <section className="control-block">
        <h3>重置</h3>
        <button type="button" className="btn danger-ghost" data-testid="preview-reset" onClick={() => { dispatch({ type: 'RESET' }); window.location.hash = '/welcome'; }}>
          回到首次访问
        </button>
      </section>

      <footer className="preview-controls-foot">
        <span>演示账号 · 合成数据</span>
      </footer>
    </aside>
  );
}
