import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { DOCUMENT_ENDPOINTS, getUploadHeaders } from './api';

const BulkUploadPage = () => {
  const [uploading, setUploading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  const handleCsvChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      alert('Please select a CSV file');
    }
  };

  const handlePdfChange = (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    setPdfFiles(pdfFiles);
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(DOCUMENT_ENDPOINTS.DOWNLOAD_TEMPLATE);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_upload_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Error downloading template');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile || pdfFiles.length === 0) {
      alert('Please select both CSV and PDF files');
      return;
    }

    const headers = getUploadHeaders();
    if (!headers) {
      alert('Please login to upload documents');
      navigate('/login');
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('csv_file', csvFile);
      pdfFiles.forEach(file => {
        formData.append('pdf_files', file);
      });

      const response = await axios.post(DOCUMENT_ENDPOINTS.UPLOAD_BULK, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        }
      });

      setResults(response.data);
      alert(`Bulk upload completed! ${response.data.successful_uploads.length} successful, ${response.data.errors.length} errors.`);

      // Reset form
      setCsvFile(null);
      setPdfFiles([]);
      document.getElementById('csv-input').value = '';
      document.getElementById('pdf-input').value = '';

    } catch (error) {
      console.error('Bulk upload error:', error);
      if (error.response?.status === 403) {
        alert('You do not have permission to upload documents');
      } else if (error.response?.status === 401) {
        alert('Please login to upload documents');
        navigate('/login');
      } else {
        alert('Error uploading documents');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Instructions</h2>
          <button
            onClick={downloadTemplate}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download size={16} />
            <span>Download CSV Template</span>
          </button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">How to use bulk upload:</h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-1 text-sm">
            <li>Download the CSV template above</li>
            <li>Fill in the metadata for all your documents</li>
            <li>Ensure PDF filenames in CSV match actual PDF files</li>
            <li>Upload the CSV file and all PDF files together</li>
            <li>Required fields: filename, medical_system, research_category</li>
          </ol>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CSV File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV Metadata File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                onChange={handleCsvChange}
                className="hidden"
              />
              <label htmlFor="csv-input" className="cursor-pointer">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {csvFile ? csvFile.name : 'Choose CSV file'}
                </p>
                <p className="text-gray-500">Click to browse CSV file with metadata</p>
              </label>
            </div>
          </div>

          {/* PDF Files Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF Documents *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                multiple
                onChange={handlePdfChange}
                className="hidden"
              />
              <label htmlFor="pdf-input" className="cursor-pointer">
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {pdfFiles.length > 0 ? `${pdfFiles.length} PDF files selected` : 'Choose PDF files'}
                </p>
                <p className="text-gray-500">Click to browse multiple PDF files</p>
              </label>
            </div>
            {pdfFiles.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700">Selected PDFs:</p>
                <ul className="mt-1 text-sm text-gray-600 max-h-32 overflow-y-auto">
                  {pdfFiles.map((file, index) => (
                    <li key={index} className="truncate">• {file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Results Display */}
          {results && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Results</h3>
              
              {results.successful_uploads.length > 0 && (
                <div className="mb-4">
                  <p className="text-green-600 font-medium mb-2">
                    ✅ Successful: {results.successful_uploads.length} documents
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded p-3 max-h-32 overflow-y-auto">
                    {results.successful_uploads.map((item, index) => (
                      <div key={index} className="text-sm text-green-700">
                        • {item.filename} (ID: {item.doc_id})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.errors.length > 0 && (
                <div>
                  <p className="text-red-600 font-medium mb-2 flex items-center">
                    <AlertCircle size={16} className="mr-2" />
                    Errors: {results.errors.length}
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                    {results.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !csvFile || pdfFiles.length === 0}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <div className="loading-spinner"></div>
                <span>Uploading {pdfFiles.length} documents...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>Upload {pdfFiles.length} Documents</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BulkUploadPage;