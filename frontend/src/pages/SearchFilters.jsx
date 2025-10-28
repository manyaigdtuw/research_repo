import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import axios from 'axios';

const SearchFilters = ({ filters, onFiltersChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    medical_systems: [],
    research_categories: [],
    project_status: [],
    institutions: [],
    authors: [],
    journals: [],
    investigators: []
  });

  // Mapping for display names
  const medicalSystemLabels = {
    'UNANI': 'Unani',
    'AYURVEDA': 'Ayurveda',
    'YOGA': 'Yoga',
    'SIDDHA': 'Siddha'
  };

  const researchCategoryLabels = {
    'CLINICAL_GRADE_A': 'Clinical Research Grade A',
    'CLINICAL_GRADE_B': 'Clinical Research Evidence Grade B',
    'CLINICAL_GRADE_C': 'Clinical Research Evidence Grade C',
    'PRE_CLINICAL': 'Pre Clinical Research',
    'FUNDAMENTAL': 'Fundamental Research',
    'DRUG': 'Drug Research'
  };

  const projectStatusLabels = {
    'ONGOING': 'Ongoing',
    'COMPLETED': 'Completed',
    'TERMINATED': 'Terminated'
  };

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/filters/options');
        setFilterOptions(response.data);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };
    fetchFilterOptions();
  }, []);

  const clearFilters = () => {
    onFiltersChange({
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

  const handleMedicalSystemChange = (system) => {
    onFiltersChange({ 
      ...filters, 
      medical_system: filters.medical_system === system ? '' : system 
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '' && value !== null);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50"
        >
          <Filter size={18} />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {Object.values(filters).filter(v => v !== '' && v !== null).length}
            </span>
          )}
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <X size={16} />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-4 p-6 bg-white border rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Medical System - Radio Buttons */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Medical System
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {filterOptions.medical_systems.map(system => (
                <div key={system} className="flex items-center">
                  <input
                    type="radio"
                    id={`medical-system-${system}`}
                    name="medical_system"
                    value={system}
                    checked={filters.medical_system === system}
                    onChange={() => handleMedicalSystemChange(system)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label 
                    htmlFor={`medical-system-${system}`}
                    className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900"
                  >
                    {medicalSystemLabels[system] || system}
                  </label>
                </div>
              ))}
            </div>
            {filters.medical_system && (
              <div className="mt-2">
                <button
                  onClick={() => handleMedicalSystemChange(filters.medical_system)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <X size={14} />
                  <span>Clear selection</span>
                </button>
              </div>
            )}
          </div>

          {/* Research Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Research Category
            </label>
            <select
              value={filters.research_category || ''}
              onChange={(e) => onFiltersChange({ ...filters, research_category: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {filterOptions.research_categories.map(category => (
                <option key={category} value={category}>
                  {researchCategoryLabels[category] || category}
                </option>
              ))}
            </select>
          </div>

          {/* Project Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Status
            </label>
            <select
              value={filters.project_status || ''}
              onChange={(e) => onFiltersChange({ ...filters, project_status: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              {filterOptions.project_status.map(status => (
                <option key={status} value={status}>
                  {projectStatusLabels[status] || status}
                </option>
              ))}
            </select>
          </div>

          {/* Institution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Institution
            </label>
            <select
              value={filters.institution || ''}
              onChange={(e) => onFiltersChange({ ...filters, institution: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Institutions</option>
              {filterOptions.institutions.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Author
            </label>
            <select
              value={filters.author || ''}
              onChange={(e) => onFiltersChange({ ...filters, author: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Authors</option>
              {filterOptions.authors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          {/* Journal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Journal
            </label>
            <select
              value={filters.journal || ''}
              onChange={(e) => onFiltersChange({ ...filters, journal: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Journals</option>
              {filterOptions.journals.map(journal => (
                <option key={journal} value={journal}>{journal}</option>
              ))}
            </select>
          </div>

          {/* Investigator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Investigator
            </label>
            <select
              value={filters.investigator || ''}
              onChange={(e) => onFiltersChange({ ...filters, investigator: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Investigators</option>
              {filterOptions.investigators.map(inv => (
                <option key={inv} value={inv}>{inv}</option>
              ))}
            </select>
          </div>

          {/* Year Range */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Publication Year Range
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={filters.year_from || ''}
                onChange={(e) => onFiltersChange({ ...filters, year_from: e.target.value })}
                placeholder="From year"
                className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={filters.year_to || ''}
                onChange={(e) => onFiltersChange({ ...filters, year_to: e.target.value })}
                placeholder="To year"
                className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;