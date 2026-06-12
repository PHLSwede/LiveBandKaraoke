import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BandApp from './BandApp';
import SingerApp from './SingerApp';
import StageDisplay from './StageDisplay';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/sing" element={<SingerApp />} />
      <Route path="/band" element={<BandApp />} />
      <Route path="/stage" element={<StageDisplay />} />
      <Route path="/" element={<Navigate to="/sing" replace />} />
    </Routes>
  </BrowserRouter>
);
