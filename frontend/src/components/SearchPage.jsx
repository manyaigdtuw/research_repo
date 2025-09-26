import React, { useState, useEffect } from "react";
import { searchPapers, downloadPaper, getAllPapers } from "../api";
import SearchResults from "./SearchResults";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchStats, setSearchStats] = useState(null);
    const [filters, setFilters] = useState({
        category: "",
        project: "",
    });
    const [allPapers, setAllPapers] = useState([]);

    // Load all papers for filter options
    useEffect(() => {
        loadAllPapers();
    }, []);

    const loadAllPapers = async () => {
        try {
            const response = await getAllPapers();
            setAllPapers(response.data);
        } catch (error) {
            console.error("Failed to load papers:", error);
        }
    };

    const handleSearch = async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setSearchStats(null);
        try {
            const startTime = performance.now();
            const res = await searchPapers(query);
            const endTime = performance.now();
            
            let filteredResults = res.data.results;
            
            // Apply filters
            if (filters.category) {
                filteredResults = filteredResults.filter(result => 
                    result.category === filters.category
                );
            }
            
            if (filters.project) {
                filteredResults = filteredResults.filter(result => 
                    result.project_name === filters.project
                );
            }
            
            setResults(filteredResults);
            setSearchStats({
                time: (endTime - startTime) / 1000,
                count: filteredResults.length,
                total: res.data.total_count
            });
        } catch (error) {
            console.error("Search failed:", error);
            if (error.response?.status === 404) {
                alert("Search endpoint not found. Please check the server configuration.");
            } else {
                alert("Search failed. Please try again.");
            }
        }
        setLoading(false);
    };

    const handleDownload = async (paperId, filename) => {
        try {
            const response = await downloadPaper(paperId);
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Download failed. Please try again.");
        }
    };

    // Get unique values for filters from all papers (not just search results)
    const categories = [...new Set(allPapers.map(paper => paper.category).filter(Boolean))];
    const projects = [...new Set(allPapers.map(paper => paper.project_name).filter(Boolean))];

    const clearFilters = () => {
        setFilters({
            category: "",
            project: "",
        });
        if (query) {
            handleSearch();
        }
    };

    return (
        <div className="search-page">
            <div className="search-box-container">
                <div className="search-box">
                    <input 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="Search research papers using natural language..." 
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={loading}>
                        {loading ? "Searching..." : " Search"}
                    </button>
                </div>
                
                <div className="filters-section">
                    <h4> Filter Results</h4>
                    <div className="filter-controls">
                        <div className="filter-group">
                            <label>Category</label>
                            <select 
                                value={filters.category}
                                onChange={(e) => setFilters({...filters, category: e.target.value})}
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <label>Project</label>
                            <select 
                                value={filters.project}
                                onChange={(e) => setFilters({...filters, project: e.target.value})}
                            >
                                <option value="">All Projects</option>
                                {projects.map(project => (
                                    <option key={project} value={project}>{project}</option>
                                ))}
                            </select>
                        </div>
                        
                        <button 
                            onClick={clearFilters}
                            className="btn-secondary"
                            style={{alignSelf: 'flex-end', padding: '0.75rem 1rem'}}
                        >
                             Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {searchStats && (
                <div className="search-stats">
                    Found {searchStats.count} results (filtered from {searchStats.total} total) in {searchStats.time.toFixed(2)} seconds
                </div>
            )}

            <SearchResults 
                results={results} 
                query={query} 
                loading={loading} 
                onDownload={handleDownload}
            />
        </div>
    );
}