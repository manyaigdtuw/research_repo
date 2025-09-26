import React from "react";
import { downloadPaper } from "../api";

export default function SearchResults({ results, query, loading, onDownload }) {
    if (loading) {
        return <div className="loading">Searching...</div>;
    }

    if (!query) {
        return (
            <div className="search-placeholder">
                <p>Enter a search query to find relevant research papers</p>
            </div>
        );
    }

    if (results.length === 0 && query) {
        return (
            <div className="no-results">
                <h3>No results found for "{query}"</h3>
                <p>Suggestions:</p>
                <ul>
                    <li>Try using different keywords or phrases</li>
                    <li>Use more specific research terms</li>
                    <li>Check your spelling</li>
                </ul>
            </div>
        );
    }

    return (
        <div className="search-results">
            <div className="results-list">
                {results.map((result, index) => (
                    <div key={result.id} className="result-item">
                        <div className="result-main">
                            <h3 className="result-title">
                                {result.title}
                                {result.similarity_score && (
                                    <span className="similarity-score">
                                        {Math.round(result.similarity_score * 100)}% match
                                    </span>
                                )}
                            </h3>
                            
                            <div className="result-authors">
                                {result.authors && result.authors.length > 0 
                                    ? result.authors.join(", ")
                                    : "Authors not specified"
                                }
                            </div>
                            
                            {result.journal && (
                                <div className="result-journal">
                                    {result.journal}
                                    {result.publication_date && (
                                        ` • ${new Date(result.publication_date).getFullYear()}`
                                    )}
                                </div>
                            )}
                            
                            <div className="result-snippet">
                                {result.snippet}
                            </div>
                            
                            {result.abstract && (
                                <div className="result-abstract">
                                    <strong>Abstract:</strong> {result.abstract.length > 200 
                                        ? result.abstract.substring(0, 200) + "..." 
                                        : result.abstract}
                                </div>
                            )}
                        </div>
                        
                        <div className="result-actions">
                            <button 
                                className="download-btn"
                                onClick={() => onDownload(result.id, result.filename)}
                                title="Download PDF"
                            >
                                📥 Download
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}