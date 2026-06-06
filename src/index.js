import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BandApp from './BandApp';
import SingerApp from './SingerApp';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/sing" element={<SingerApp />} />
      <Route path="/band" element={<BandApp />} />
      <Route path="/" element={<Navigate to="/sing" replace />} />
    </Routes>
  </BrowserRouter>
);
