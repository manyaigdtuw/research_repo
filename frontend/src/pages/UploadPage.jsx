import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import axios from 'axios';
import { uploadDocument } from './api';

const UploadPage = () => {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    // Required fields
    medical_system: '',
    research_category: '',
    
    // Project Details
    project_title: '',
    start_year: '',
    end_year: '',
    institution: '',
    investigator_name: '',
    sanction_date: '',
    project_status: 'ONGOING',
    
    // Publication Details
    article_title: '',
    publication_year: '',
    authors: '',
    journal_name: '',
    
    // Research Details
    objectives: '',
    study_protocol: '',
    outcomes: ''
  });
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.medical_system || !formData.research_category) {
      alert('Please select a file, medical system, and research category');
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      // Append all form data
      Object.entries(formData).forEach(([key, value]) => {
        if (value) uploadFormData.append(key, value);
      });

      const response = await axios.post('http://localhost:8000/api/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Document uploaded successfully!');
      
      // Reset form
      setFormData({
        medical_system: '',
        research_category: '',
        project_title: '',
        start_year: '',
        end_year: '',
        institution: '',
        investigator_name: '',
        sanction_date: '',
        project_status: 'ONGOING',
        article_title: '',
        publication_year: '',
        authors: '',
        journal_name: '',
        objectives: '',
        study_protocol: '',
        outcomes: ''
      });
      setFile(null);
      document.getElementById('file-input').value = '';
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Upload Research Document</h1>
        <p className="text-gray-600">Upload PDF documents to add them to the research repository</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields - Medical System and Research Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical System *
              </label>
              <select
                name="medical_system"
                value={formData.medical_system}
                onChange={handleInputChange}
                required
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select medical system</option>
                <option value="UNANI">Unani</option>
                <option value="AYURVEDA">Ayurveda</option>
                <option value="YOGA">Yoga</option>
                <option value="SIDDHA">Siddha</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Research Category *
              </label>
              <select
                name="research_category"
                value={formData.research_category}
                onChange={handleInputChange}
                required
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="CLINICAL_GRADE_A">Clinical Research Grade A</option>
                <option value="CLINICAL_GRADE_B">Clinical Research Evidence Grade B</option>
                <option value="CLINICAL_GRADE_C">Clinical Research Evidence Grade C</option>
                <option value="PRE_CLINICAL">Pre Clinical Research</option>
                <option value="FUNDAMENTAL">Fundamental Research</option>
                <option value="DRUG">Drug Research</option>
              </select>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload PDF Document *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {file ? file.name : 'Choose PDF file'}
                </p>
                <p className="text-gray-500">Click to browse or drag and drop</p>
              </label>
            </div>
          </div>

          {/* Project Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Title
                </label>
                <input
                  type="text"
                  name="project_title"
                  value={formData.project_title}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Title of the research project"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Year
                </label>
                <input
                  type="number"
                  name="start_year"
                  value={formData.start_year}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="YYYY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Year
                </label>
                <input
                  type="number"
                  name="end_year"
                  value={formData.end_year}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="YYYY"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution
                </label>
                <input
                  type="text"
                  name="institution"
                  value={formData.institution}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name of institution"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Investigator
                </label>
                <input
                  type="text"
                  name="investigator_name"
                  value={formData.investigator_name}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name of primary investigator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sanction Date
                </label>
                <input
                  type="date"
                  name="sanction_date"
                  value={formData.sanction_date}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Status
                </label>
                <select
                  name="project_status"
                  value={formData.project_status}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Publication Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Publication Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article Title
                </label>
                <input
                  type="text"
                  name="article_title"
                  value={formData.article_title}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Title of published article"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publication Year
                </label>
                <input
                  type="number"
                  name="publication_year"
                  value={formData.publication_year}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="YYYY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Journal Name
                </label>
                <input
                  type="text"
                  name="journal_name"
                  value={formData.journal_name}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name of journal"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authors
                </label>
                <input
                  type="text"
                  name="authors"
                  value={formData.authors}
                  onChange={handleInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="List of authors (comma separated)"
                />
              </div>
            </div>
          </div>

          {/* Research Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Research Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objectives
                </label>
                <textarea
                  name="objectives"
                  value={formData.objectives}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Research objectives"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Protocol
                </label>
                <textarea
                  name="study_protocol"
                  value={formData.study_protocol}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Study protocol details"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Research Outcomes
                </label>
                <textarea
                  name="outcomes"
                  value={formData.outcomes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Research outcomes and findings"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !file || !formData.medical_system || !formData.research_category}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <div className="loading-spinner"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>Upload Document</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;