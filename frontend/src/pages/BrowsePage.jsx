import React, { useState, useEffect } from 'react';
import { Database, Download, Calendar, Building, User, BookOpen } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse Research Documents</h1>
        <p className="text-gray-600">Explore all research documents in the repository</p>
      </div>

      <div className="grid gap-6">
        {documents.map((document) => (
          <div key={document.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {document.title}
                </h3>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {document.medical_system}
                  </span>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    {document.research_category}
                  </span>
                  <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                    document.project_status === 'Completed' ? 'bg-green-100 text-green-800' :
                    document.project_status === 'Ongoing' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {document.project_status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-gray-400" />
                    <span>{document.authors}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building size={16} className="text-gray-400" />
                    <span>{document.institution}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span>
                      {document.start_year} {document.end_year ? `- ${document.end_year}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BookOpen size={16} className="text-gray-400" />
                    <span>{document.journal_name}</span>
                  </div>
                </div>

                {document.project_title && (
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-1">Project:</h4>
                    <p className="text-sm text-gray-600">{document.project_title}</p>
                  </div>
                )}

                {document.investigator && (
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-1">Investigator:</h4>
                    <p className="text-sm text-gray-600">{document.investigator}</p>
                  </div>
                )}

                {document.objectives && (
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-1">Objectives:</h4>
                    <p className="text-sm text-gray-600">{document.objectives}</p>
                  </div>
                )}

                {document.outcomes && (
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-1">Outcomes:</h4>
                    <p className="text-sm text-gray-600">{document.outcomes}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDownload(document.id, document.filename)}
                className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center space-x-2"
              >
                <Download size={16} />
                <span>PDF</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <Database size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">Upload some documents to see them here</p>
        </div>
      )}
    </div>
  );
};

export default BrowsePage;