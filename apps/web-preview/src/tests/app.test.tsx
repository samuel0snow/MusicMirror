import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App.js';
import { PreviewProvider } from '../preview/PreviewContext.js';

describe('interactive preview', () => {
  beforeEach(() => { window.location.hash = '#/welcome'; localStorage.clear(); });
  it('renders the phone preview and all route choices', () => {
    render(<PreviewProvider><App /></PreviewProvider>);
    expect(screen.getByTestId('phone-frame')).toBeInTheDocument();
    expect(screen.getByLabelText('选择页面').querySelectorAll('option')).toHaveLength(17);
    expect(screen.getByRole('heading', {name:'光与回声'})).toBeInTheDocument();
  });
  it('opens the ready home scenario from controls', async () => {
    render(<PreviewProvider><App /></PreviewProvider>);
    fireEvent.change(screen.getByLabelText('选择页面'), {target:{value:'home'}});
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    expect(await screen.findByRole('heading', {name:'我的音乐审美'})).toBeInTheDocument();
    expect(screen.getByTestId('bottom-tabs')).toBeInTheDocument();
  });
});
