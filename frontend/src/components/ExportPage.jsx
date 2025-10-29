import React, { useState } from 'react';
import { Download, Filter, Database, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { EXPORT_ENDPOINTS, getAuthHeaders } from './api';

const ExportPage = () => {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('all'); // 'all' or 'filtered'
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
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExport = async (e) => {
    e.preventDefault();
    
    const headers = getAuthHeaders();
    if (!headers) {
      alert('Please login to export documents');
      navigate('/login');
      return;
    }

    setExporting(true);
    setResults(null);

    try {
      let url = EXPORT_ENDPOINTS.EXPORT_ALL;
      let params = {};

      if (exportType === 'filtered') {
        url = EXPORT_ENDPOINTS.EXPORT_FILTERED;
        // Add non-empty filters as params
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value.trim() !== '') {
            params[key] = value;
          }
        });
      }

      const response = await axios.get(url, {
        params: params,
        headers: headers,
        responseType: 'blob' // Important for file download
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'documents_export.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setResults({
        success: true,
        message: `Export completed successfully! Downloaded: ${filename}`,
        documentCount: exportType === 'filtered' ? 'Filtered documents' : 'All documents'
      });

    } catch (error) {
      console.error('Export error:', error);
      if (error.response?.status === 403) {
        alert('You do not have permission to export documents');
      } else if (error.response?.status === 401) {
        alert('Please login to export documents');
        navigate('/login');
      } else {
        setResults({
          success: false,
          message: 'Error exporting documents. Please try again.',
          documentCount: null
        });
      }
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
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
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value.trim() !== '');

  return (
    <div className="max-w-4xl mx-auto">
      

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Export Options</h2>
          <Database className="text-blue-600" size={24} />
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">Export Features:</h3>
          <ul className="list-disc list-inside text-blue-700 space-y-1 text-sm">
            <li>Export all documents or apply filters</li>
            <li>CSV format compatible with Excel/Google Sheets</li>
            <li>Includes all metadata fields for re-import</li>
            <li>Filtered exports maintain search criteria</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={handleExport} className="space-y-6">
          {/* Export Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Export Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                exportType === 'all' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="exportType"
                  value="all"
                  checked={exportType === 'all'}
                  onChange={(e) => setExportType(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="font-medium text-gray-900">Export All Documents</span>
                  <p className="text-sm text-gray-500">Export complete database</p>
                </div>
                <Database size={20} className="ml-auto text-gray-400" />
              </label>

              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                exportType === 'filtered' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="exportType"
                  value="filtered"
                  checked={exportType === 'filtered'}
                  onChange={(e) => setExportType(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="font-medium text-gray-900">Export with Filters</span>
                  <p className="text-sm text-gray-500">Apply search filters</p>
                </div>
                <Filter size={20} className="ml-auto text-gray-400" />
              </label>
            </div>
          </div>

          {/* Filter Options - Only show for filtered export */}
          {exportType === 'filtered' && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Filter Options</h3>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical System
                  </label>
                  <select
                    name="medical_system"
                    value={filters.medical_system}
                    onChange={handleFilterChange}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Systems</option>
                    <option value="UNANI">Unani</option>
                    <option value="AYURVEDA">Ayurveda</option>
                    <option value="YOGA">Yoga</option>
                    <option value="SIDDHA">Siddha</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Research Category
                  </label>
                  <select
                    name="research_category"
                    value={filters.research_category}
                    onChange={handleFilterChange}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    <option value="CLINICAL_GRADE_A">Clinical Research Grade A</option>
                    <option value="CLINICAL_GRADE_B">Clinical Research Evidence Grade B</option>
                    <option value="CLINICAL_GRADE_C">Clinical Research Evidence Grade C</option>
                    <option value="PRE_CLINICAL">Pre Clinical Research</option>
                    <option value="FUNDAMENTAL">Fundamental Research</option>
                    <option value="DRUG">Drug Research</option>
                  </select>
                </div>

              </div>
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className={`border rounded-lg p-4 ${
              results.success 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center space-x-2">
                {results.success ? (
                  <CheckCircle size={20} className="text-green-600" />
                ) : (
                  <AlertCircle size={20} className="text-red-600" />
                )}
                <span className={results.success ? 'text-green-800' : 'text-red-800'}>
                  {results.message}
                </span>
              </div>
              {results.documentCount && (
                <p className={`text-sm mt-1 ${results.success ? 'text-green-700' : 'text-red-700'}`}>
                  {results.documentCount}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={exporting}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {exporting ? (
              <>
                <div className="loading-spinner border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Export to CSV</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExportPage;