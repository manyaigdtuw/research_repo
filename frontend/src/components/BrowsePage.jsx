// BrowsePage.jsx
import React, { useState, useEffect } from 'react';
import { Database, Download, Calendar, Building, User, BookOpen, FileText } from 'lucide-react';
import axios from 'axios';

const BrowsePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/browse');
      setDocuments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
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
    }
  };

  // Clean and truncate text for better display
  const cleanText = (text, maxLength = 100) => {
    if (!text) return 'Not specified';
    
    let cleaned = text
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
    
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength) + '...';
    }
    
    return cleaned;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'ONGOING': { color: 'bg-blue-100 text-blue-800', label: 'Ongoing' },
      'COMPLETED': { color: 'bg-green-100 text-green-800', label: 'Completed' },
      'TERMINATED': { color: 'bg-red-100 text-red-800', label: 'Terminated' },
      'Completed': { color: 'bg-green-100 text-green-800', label: 'Completed' },
      'Ongoing': { color: 'bg-blue-100 text-blue-800', label: 'Ongoing' }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Documents Count */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database size={24} className="text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">All Documents</h2>
              <p className="text-sm text-gray-600">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'} in repository
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <FileText size={20} />
              <span>All Research Documents</span>
            </h2>
            <span className="text-sm text-gray-500">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </span>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12">
            <Database size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Upload some documents to see them here
            </p>
          </div>
        ) : (
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
                    Project Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <FileText size={24} className="text-blue-600 mt-1" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
                            {document.title || document.article_title || 'Untitled Document'}
                          </h3>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {getMedicalSystemBadge(document.medical_system)}
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              {getResearchCategoryLabel(document.research_category)}
                            </span>
                          </div>

                          <div className="text-xs text-gray-500 space-y-1">
                            {document.authors && (
                              <div className="flex items-center space-x-1">
                                <User size={12} />
                                <span className="line-clamp-1">{cleanText(document.authors, 50)}</span>
                              </div>
                            )}
                            {document.journal_name && (
                              <div className="flex items-center space-x-1">
                                <BookOpen size={12} />
                                <span className="line-clamp-1">{cleanText(document.journal_name, 40)}</span>
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
                            <span className="line-clamp-2">{document.institution || 'Not specified'}</span>
                          </p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Year</h4>
                          <p className="text-sm text-gray-900 flex items-center space-x-1">
                            <Calendar size={14} />
                            <span>
                              {document.publication_year || document.year || 
                                (document.start_year && document.end_year ? 
                                  `${document.start_year} - ${document.end_year}` : 
                                  document.start_year || 'Unknown'
                                )
                              }
                            </span>
                          </p>
                        </div>
                        {document.project_title && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Project Title</h4>
                            <p className="text-sm text-gray-900 line-clamp-2">{cleanText(document.project_title, 60)}</p>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Status</h4>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(document.project_status)}
                          </div>
                        </div>
                        
                        {document.investigator_name && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Investigator</h4>
                            <p className="text-sm text-gray-900 line-clamp-2">{cleanText(document.investigator_name, 40)}</p>
                          </div>
                        )}

                        {document.objectives && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Objectives</h4>
                            <p className="text-sm text-gray-900 line-clamp-2">{cleanText(document.objectives, 80)}</p>
                          </div>
                        )}

                        {document.outcomes && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Outcomes</h4>
                            <p className="text-sm text-gray-900 line-clamp-2">{cleanText(document.outcomes, 80)}</p>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => handleDownload(document.id, document.filename)}
                          className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 shadow-sm"
                        >
                          <Download size={16} />
                          <span>Download PDF</span>
                        </button>
                        
                        <div className="text-xs text-gray-500 text-center">
                          {document.filename && (
                            <div className="line-clamp-1" title={document.filename}>
                              {document.filename.length > 20 
                                ? document.filename.substring(0, 20) + '...' 
                                : document.filename
                              }
                            </div>
                          )}
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

      {/* Summary Footer */}
      {documents.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Showing all {documents.length} documents • Use the search page for advanced filtering
        </div>
      )}
    </div>
  );
};

export default BrowsePage;