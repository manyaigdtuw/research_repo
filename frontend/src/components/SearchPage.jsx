import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, Building, User, BookOpen, AlertCircle, FileText } from 'lucide-react';
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

  // Clean and truncate snippet text
  const cleanSnippet = (snippet, maxLength = 120) => {
    if (!snippet) return 'No description available';
    
    // Remove excessive whitespace and newlines
    let cleaned = snippet
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
    
    // Remove common irrelevant phrases
    const irrelevantPhrases = [
      'this document is',
      'the following paper',
      'in this research',
      'this study aims',
      'abstract:',
      'introduction:',
      'background:',
      'objective:',
      'method:',
      'result:',
      'conclusion:'
    ];
    
    irrelevantPhrases.forEach(phrase => {
      cleaned = cleaned.replace(new RegExp(phrase, 'gi'), '');
    });
    
    // Truncate to max length and add ellipsis
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength) + '...';
    }
    
    return cleaned || 'Research document description';
  };

  // Extract key information for better display
  const extractKeyInfo = (result) => {
    const keyFields = [
      'objectives',
      'outcomes', 
      'study_protocol',
      'project_title',
      'article_title'
    ];
    
    for (let field of keyFields) {
      if (result[field] && result[field].trim().length > 10) {
        return cleanSnippet(result[field], 100);
      }
    }
    
    return cleanSnippet(result.snippet);
  };

  const checkServerStatus = async () => {
    try {
      console.log('🔍 Checking server status...');
      const response = await axios.get('http://localhost:8000/api/filters/options');
      console.log('Server is running, filter options loaded');
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
      
      // Process results to clean up snippets
      const processedResults = response.data.map(result => ({
        ...result,
        displaySnippet: extractKeyInfo(result),
        cleanTitle: result.title ? result.title.replace(/\s+/g, ' ').trim() : 'Untitled Document'
      }));
      
      setResults(processedResults);
    } catch (error) {
      console.error('❌ Search error:', error);
      setError('Search failed. Please check if the server is running.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId, filename) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/download/${documentId}`,
        { 
          responseType: 'blob'
        }
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'ONGOING': { color: 'bg-blue-100 text-blue-800', label: 'Ongoing' },
      'COMPLETED': { color: 'bg-green-100 text-green-800', label: 'Completed' },
      'TERMINATED': { color: 'bg-red-100 text-red-800', label: 'Terminated' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getMedicalSystemBadge = (system) => {
    const systemConfig = {
      'UNANI': { color: 'bg-purple-100 text-purple-800', label: 'Unani' },
      'AYURVEDA': { color: 'bg-orange-100 text-orange-800', label: 'Ayurveda' },
      'YOGA': { color: 'bg-teal-100 text-teal-800', label: 'Yoga' },
      'SIDDHA': { color: 'bg-indigo-100 text-indigo-800', label: 'Siddha' }
    };
    
    const config = systemConfig[system] || { color: 'bg-gray-100 text-gray-800', label: system };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getResearchCategoryLabel = (category) => {
    const categoryLabels = {
      'CLINICAL_GRADE_A': 'Clinical Grade A',
      'CLINICAL_GRADE_B': 'Clinical Grade B', 
      'CLINICAL_GRADE_C': 'Clinical Grade C',
      'PRE_CLINICAL': 'Pre-Clinical',
      'FUNDAMENTAL': 'Fundamental',
      'DRUG': 'Drug Research'
    };
    return categoryLabels[category] || category;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
          <AlertCircle size={24} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <form onSubmit={handleSearch}>
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter research keywords, topics, or questions..."
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center space-x-2 shadow-sm transition-all duration-200"
            >
              <Search size={20} />
              <span className="font-medium">{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <SearchFilters filters={filters} onFiltersChange={setFilters} />

      {/* Results Section */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Results Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <FileText size={20} />
              <span>Search Results</span>
            </h2>
            <span className="text-sm text-gray-500">
              {results.length} {results.length === 1 ? 'document' : 'documents'} found
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Searching through documents...</span>
          </div>
        )}

        {/* No Results State */}
        {!loading && results.length === 0 && (query || Object.values(filters).some(f => f)) && (
          <div className="text-center py-12">
            <BookOpen size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Try adjusting your search terms or filters.
            </p>
          </div>
        )}

        {/* Initial State */}
        {!loading && !query && Object.values(filters).every(f => !f) && (
          <div className="text-center py-12">
            <Search size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Ready to explore</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Enter a search query above or use the filters to discover research documents.
            </p>
          </div>
        )}

        {/* Results Table */}
        {!loading && results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Research Information
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={result.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <FileText size={24} className="text-blue-600 mt-1" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
                            {result.cleanTitle}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                            {result.displaySnippet}
                          </p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {getMedicalSystemBadge(result.medical_system)}
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              {getResearchCategoryLabel(result.research_category)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            {result.authors && (
                              <div className="flex items-center space-x-1">
                                <User size={12} />
                                <span className="line-clamp-1">{result.authors}</span>
                              </div>
                            )}
                            {result.journal_name && (
                              <div className="flex items-center space-x-1">
                                <BookOpen size={12} />
                                <span className="line-clamp-1">{result.journal_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Institution</h4>
                          <p className="text-sm text-gray-900 flex items-center space-x-1">
                            <Building size={14} />
                            <span className="line-clamp-2">{result.institution || 'Not specified'}</span>
                          </p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Investigator</h4>
                          <p className="text-sm text-gray-900 line-clamp-2">{result.investigator_name || 'Not specified'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Status & Year</h4>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(result.project_status)}
                            <span className="text-sm text-gray-900 flex items-center space-x-1">
                              <Calendar size={14} />
                              <span>{result.year || result.publication_year || 'Unknown'}</span>
                            </span>
                          </div>
                        </div>
                        {result.objectives && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Focus Area</h4>
                            <p className="text-sm text-gray-900 line-clamp-2">{cleanSnippet(result.objectives, 80)}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => handleDownload(result.id, result.filename)}
                          className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 shadow-sm"
                        >
                          <Download size={16} />
                          <span>Download</span>
                        </button>
                        <div className="text-xs text-gray-500 text-center">
                          PDF Document
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;