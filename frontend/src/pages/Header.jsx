import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Upload, Database } from 'lucide-react';

const Header = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Search, label: 'Search' },
    { path: '/upload', icon: Upload, label: 'Upload' },
    { path: '/browse', icon: Database, label: 'Browse' },
  ];

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-blue-800">
              Research Repository
            </h1>
            <nav className="flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600 hover:text-blue-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;