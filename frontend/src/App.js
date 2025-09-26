import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import SearchPage from './components/SearchPage';
import AdminUploadPage from './components/AdminUploadPage';
import LoginPage from './components/LoginPage';
import ProjectManagement from './components/ProjectManagement';
import { checkAuth } from './api';
import './App.css';

function Navigation() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            checkAuth().then(response => {
                setIsAuthenticated(true);
                setIsAdmin(response.data.is_admin);
            }).catch(() => {
                localStorage.removeItem('token');
                setIsAuthenticated(false);
            });
        }
    }, [location]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setIsAdmin(false);
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <h1>Research Repository</h1>
                <span className="tagline">Advanced Research Document Management</span>
            </div>
            <ul className="nav-links">
                <li><Link to="/" className={location.pathname === '/' ? 'active' : ''}>Search</Link></li>
                {isAuthenticated && isAdmin && (
                    <>
                        <li><Link to="/upload" className={location.pathname === '/upload' ? 'active' : ''}>Upload</Link></li>
                        <li><Link to="/projects" className={location.pathname === '/projects' ? 'active' : ''}>Projects</Link></li>
                    </>
                )}
                {isAuthenticated ? (
                    <li>
                        <button onClick={handleLogout} className="logout-btn">Logout</button>
                    </li>
                ) : (
                    <li><Link to="/login" className={location.pathname === '/login' ? 'active' : ''}>Admin Login</Link></li>
                )}
            </ul>
        </nav>
    );
}

export default function App() {
    return (
        <Router>
            <div className="app-container">
                <Navigation />
                <div className="content">
                    <Routes>
                        <Route path="/" element={<SearchPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/upload" element={<AdminUploadPage />} />
                        <Route path="/projects" element={<ProjectManagement />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}