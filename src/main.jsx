import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PartnerAuthProvider } from './context/AuthContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PartnerAuthProvider>
      <App />
    </PartnerAuthProvider>
  </React.StrictMode>
);
