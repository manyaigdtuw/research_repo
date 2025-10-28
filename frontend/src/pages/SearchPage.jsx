import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, Building, User, BookOpen, AlertCircle } from 'lucide-react';
import axios from 'axios';
import SearchFilters from './SearchFilters';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    medical_system: '',
    research_category: '',
    institution: '',
    author: '',
    journal: '',
    year_from: '',
    year_to: '',
    project_status: '',
    investigator: ''
  });

  // Debug function to check server status
  const checkServerStatus = async () => {
    try {
      console.log('🔍 Checking server status...');
      const faissStatus = await axios.get('http://localhost:8000/api/debug/faiss-status');
      console.log('FAISS Status:', faissStatus.data);
      
      const documents = await axios.get('http://localhost:8000/api/debug/documents');
      console.log('Documents in DB:', documents.data);
    } catch (err) {
      console.error('Server status check failed:', err);
    }
  };

  useEffect(() => {
    checkServerStatus();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() && Object.values(filters).every(f => !f)) {
      setError('Please enter a search query or select filters');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append('query', query);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      console.log('🔍 Search params:', params.toString());
      
      const response = await axios.get(`http://localhost:8000/api/search?${params}`);
      console.log('✅ Search results:', response.data);
      setResults(response.data);
    } catch (error) {
      console.error('❌ Search error:', error);
      setError('Search failed. Please check the console for details.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId, filename) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/download/${documentId}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Download failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Research Repository Search
        </h1>
        <p className="text-lg text-gray-600">
          Search through medical research documents using semantic search
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex space-x-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your research query..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center space-x-2"
          >
            <Search size={20} />
            <span>{loading ? 'Searching...' : 'Search'}</span>
          </button>
        </div>
      </form>

      {/* Filters */}
      <SearchFilters filters={filters} onFiltersChange={setFilters} />

      

      {/* Results */}
      <div className="space-y-6">
        {loading && (
          <div className="flex justify-center">
            <div className="loading-spinner"></div>
            <span className="ml-2">Searching...</span>
          </div>
        )}

        {!loading && results.length === 0 && (query || Object.values(filters).some(f => f)) && (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your search terms or filters</p>
          </div>
        )}

        {!loading && !query && Object.values(filters).every(f => !f) && (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Enter a search query or select filters</h3>
            <p className="text-gray-600">Use the search bar above or open the filters panel to start searching</p>
          </div>
        )}

        {results.map((result) => (
          <div key={result.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {result.title}
                </h3>
                <p className="text-gray-700 mb-3">{result.snippet}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-gray-400" />
                    <span>{result.authors}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building size={16} className="text-gray-400" />
                    <span>{result.institution}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span>{result.year || 'Unknown year'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {result.medical_system}
                    </span>
                    <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      {result.research_category}
                    </span>
                  </div>
                </div>

                {result.objectives && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-900">Objectives:</h4>
                    <p className="text-sm text-gray-600">{result.objectives}</p>
                  </div>
                )}

                {result.outcomes && (
                  <div className="mt-2">
                    <h4 className="font-medium text-gray-900">Outcomes:</h4>
                    <p className="text-sm text-gray-600">{result.outcomes}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDownload(result.id, result.filename)}
                className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center space-x-2"
              >
                <Download size={16} />
                <span>PDF</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;