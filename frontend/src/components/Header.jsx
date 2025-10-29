import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Upload, User, LogOut, Settings } from 'lucide-react';
import axios from 'axios';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 Token from localStorage:', token);
      
      if (!token) {
        console.log('❌ No token found in localStorage');
        setLoading(false);
        return;
      }

      console.log('🔄 Fetching user data...');
      const response = await axios.get('http://localhost:8000/api/auth/me', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ User data received:', response.data);
      setCurrentUser(response.data);
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      console.error('❌ Error details:', error.response?.data);
      
      // If unauthorized, clear the invalid token
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        console.log('🗑️ Invalid token removed');
      }
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setShowDropdown(false);
    navigate('/');
  };

  // Debug info
  console.log('👤 Current User State:', currentUser);
  console.log('🔐 Token in localStorage:', localStorage.getItem('token'));

  const shouldShowUpload = currentUser && 
    (currentUser.role === 'SUPERADMIN' || currentUser.role === 'INSTITUTE');

  const navItems = [
    { path: '/', icon: Search, label: 'Search' },
    ...(shouldShowUpload ? [{ path: '/upload', icon: Upload, label: 'Upload' }] : [])
  ];

  // Show loading state briefly
  if (loading) {
    return (
      <header className="bg-white shadow-lg border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-10">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CCRAS
              </h3>
            </div>
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-10">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CCRAS
            </h3>
            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-5 py-3 rounded-xl transition-all duration-200 font-medium ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-blue-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile Section */}
          <div className="relative">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {currentUser.full_name} ({currentUser.role?.toLowerCase()})
                </span>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <User size={20} className="text-gray-600" />
                </button>
                
                {showDropdown && (
                  <div className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
                      <p className="text-xs text-gray-500">{currentUser.email}</p>
                      <p className="text-xs text-blue-600 capitalize">{currentUser.role?.toLowerCase()}</p>
                    </div>
                    {currentUser.role === 'SUPERADMIN' && (
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/admin');
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings size={16} />
                        <span>Manage Users</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <User size={20} />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;