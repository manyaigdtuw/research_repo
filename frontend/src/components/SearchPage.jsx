import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, Building, User, BookOpen, AlertCircle, FileText, Eye } from 'lucide-react';
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

  const handleView = (documentId) => {
    const apiUrl = `http://localhost:8000/api/download/${documentId}?view=true`;
    window.open(apiUrl, '_blank', 'noopener,noreferrer');
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

      {/* Results Table - UPDATED STRUCTURE */}
      {!loading && results.length > 0 && (
        <div className="search-results" style={{ width: '100%', marginTop: '2rem' }}>
          <div className="results-table-container" style={{ 
            overflowX: 'auto', 
            background: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' 
          }}>
            <table className="results-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ 
                    background: '#f8fafc', 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    fontSize: '0.875rem', 
                    color: '#374151', 
                    borderBottom: '1px solid #e5e7eb' 
                  }}>
                    Year
                  </th>
                  <th style={{ 
                    background: '#f8fafc', 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    fontSize: '0.875rem', 
                    color: '#374151', 
                    borderBottom: '1px solid #e5e7eb' 
                  }}>
                    Title & Details
                  </th>
                  <th style={{ 
                    background: '#f8fafc', 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    fontSize: '0.875rem', 
                    color: '#374151', 
                    borderBottom: '1px solid #e5e7eb' 
                  }}>
                    Authors
                  </th>
                  <th style={{ 
                    background: '#f8fafc', 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    fontSize: '0.875rem', 
                    color: '#374151', 
                    borderBottom: '1px solid #e5e7eb' 
                  }}>
                    Category
                  </th>
                  <th style={{ 
                    background: '#f8fafc', 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    fontSize: '0.875rem', 
                    color: '#374151', 
                    borderBottom: '1px solid #e5e7eb' 
                  }}>
                    Project Name
                  </th>
                  <th style={{ 
                    background: '#f8fafc', 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    fontSize: '0.875rem', 
                    color: '#374151', 
                    borderBottom: '1px solid #e5e7eb' 
                  }}>
                    Project Status
                  </th>
                  <th style={{ 
                    background: '#f8fafc', 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    fontSize: '0.875rem', 
                    color: '#374151', 
                    borderBottom: '1px solid #e5e7eb' 
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={result.id} className="result-row" style={{ 
                    borderBottom: '1px solid #e5e7eb',
                    transition: 'background-color 0.15s'
                  }}>
                    <td style={{ 
                      padding: '16px', 
                      verticalAlign: 'top',
                      width: '80px',
                      fontWeight: '500',
                      color: '#6b7280'
                    }}>
                      {result.year || result.publication_year || "N/A"}
                    </td>
                    <td style={{ 
                      padding: '16px', 
                      verticalAlign: 'top',
                      minWidth: '300px'
                    }}>
                      <div className="title-wrapper">
                        <strong style={{ 
                          display: 'block', 
                          fontSize: '0.95rem', 
                          color: '#111827', 
                          marginBottom: '8px', 
                          lineHeight: '1.4' 
                        }}>
                          {result.cleanTitle}
                        </strong>
                        {result.displaySnippet && (
                          <div className="abstract-preview" style={{ 
                            fontSize: '0.875rem', 
                            color: '#6b7280', 
                            lineHeight: '1.5', 
                            marginBottom: '8px' 
                          }}>
                            {result.displaySnippet}
                          </div>
                        )}
                        <div className="paper-meta" style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '6px' 
                        }}>
                          {result.medical_system && (
                            <span className="meta-tag category" style={{ 
                              background: '#f3f4f6', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              color: '#4b5563' 
                            }}>
                              {getMedicalSystemBadge(result.medical_system)}
                            </span>
                          )}
                          {result.year && (
                            <span className="meta-tag" style={{ 
                              background: '#f3f4f6', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              color: '#4b5563' 
                            }}>
                              📅 {result.year}
                            </span>
                          )}
                          {result.research_category && (
                            <span className="meta-tag" style={{ 
                              background: '#f3f4f6', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              color: '#4b5563' 
                            }}>
                              {getResearchCategoryLabel(result.research_category)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '16px', 
                      verticalAlign: 'top',
                      minWidth: '200px',
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}>
                      {result.authors ? result.authors : "Authors not specified"}
                    </td>
                    <td style={{ 
                      padding: '16px', 
                      verticalAlign: 'top',
                      minWidth: '120px'
                    }}>
                      {result.research_category ? (
                        <span className="category-badge" style={{ 
                          background: '#e0e7ff', 
                          color: '#3730a3', 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: '500' 
                        }}>
                          {getResearchCategoryLabel(result.research_category)}
                        </span>
                      ) : "N/A"}
                    </td>
                    <td style={{ 
                      padding: '16px', 
                      verticalAlign: 'top',
                      minWidth: '120px',
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}>
                      {result.project_title || "N/A"}
                    </td>
                    <td style={{ 
                      padding: '16px', 
                      verticalAlign: 'top',
                      minWidth: '120px'
                    }}>
                      {result.project_status ? (
                        getStatusBadge(result.project_status)
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td style={{ 
                      padding: '16px', 
                      verticalAlign: 'top',
                      width: '150px'
                    }}>
                      <div className="action-buttons" style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px' 
                      }}>
                        <button
                          className="download-btn"
                          onClick={() => handleView(result.id)}
                          title="View PDF"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            background: '#059669', 
                            color: 'white', 
                            border: 'none', 
                            padding: '6px 12px', 
                            borderRadius: '4px', 
                            fontSize: '0.875rem', 
                            cursor: 'pointer', 
                            transition: 'background 0.2s' 
                          }}
                        >
                          <Eye size={16} />
                          <span>View</span>
                        </button>
                        <button
                          className="download-btn"
                          onClick={() => handleDownload(result.id, result.filename)}
                          title="Download PDF"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            background: '#059669', 
                            color: 'white', 
                            border: 'none', 
                            padding: '6px 12px', 
                            borderRadius: '4px', 
                            fontSize: '0.875rem', 
                            cursor: 'pointer', 
                            transition: 'background 0.2s' 
                          }}
                        >
                          <Download size={16} />
                          <span>Download</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;