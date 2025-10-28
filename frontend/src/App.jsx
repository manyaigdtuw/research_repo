import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './pages/Header';
import SearchPage from './pages/SearchPage';
import UploadPage from './pages/UploadPage';
import BrowsePage from './pages/BrowsePage';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/browse" element={<BrowsePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;