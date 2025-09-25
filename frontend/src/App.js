import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import SearchPage from './components/SearchPage';
import UploadPage from './components/UploadPage';
import './App.css';

export default function App() {
    return (
        <Router>
            <div className="app-container">
                <nav className="navbar">
                    <h1>Research Repository</h1>
                    <ul className="nav-links">
                        <li><Link to="/">Search</Link></li>
                        <li><Link to="/upload">Upload</Link></li>
                    </ul>
                </nav>

                <div className="content">
                    <Routes>
                        <Route path="/" element={<SearchPage />} />
                        <Route path="/upload" element={<UploadPage />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}