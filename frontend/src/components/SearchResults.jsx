import React from "react";

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
            <div className="results-table-container">
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>Year</th>
                            <th>Title</th>
                            <th>Authors</th>
                            <th>Journal/Conference</th>
                            <th>Relevance</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((result, index) => (
                            <tr key={result.id} className="result-row">
                                <td className="year-column">
                                    {result.publication_date 
                                        ? new Date(result.publication_date).getFullYear()
                                        : 'N/A'
                                    }
                                </td>
                                <td className="title-column">
                                    <div className="title-wrapper">
                                        <strong>{result.title}</strong>
                                        {result.abstract && (
                                            <div className="abstract-preview">
                                                {result.abstract.length > 150 
                                                    ? result.abstract.substring(0, 150) + "..."
                                                    : result.abstract
                                                }
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="authors-column">
                                    {result.authors && result.authors.length > 0 
                                        ? result.authors.slice(0, 3).join(", ") + 
                                          (result.authors.length > 3 ? " et al." : "")
                                        : "Authors not specified"
                                    }
                                </td>
                                <td className="journal-column">
                                    {result.journal || 'N/A'}
                                </td>
                                <td className="relevance-column">
                                    {result.similarity_score && (
                                        <span className="similarity-badge">
                                            {Math.round(result.similarity_score * 100)}%
                                        </span>
                                    )}
                                </td>
                                <td className="actions-column">
                                    <button 
                                        className="download-btn"
                                        onClick={() => onDownload(result.id, result.filename)}
                                        title="Download PDF"
                                    >
                                        📥 Download
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}