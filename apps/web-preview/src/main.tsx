import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { PreviewProvider } from './preview/PreviewContext.js';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><PreviewProvider><App /></PreviewProvider></React.StrictMode>,
);
