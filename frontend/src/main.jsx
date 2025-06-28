import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css'; // ✅ Needed for your new CSS
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
