import React from "react";

export default function SearchResults({ results, query, loading, onDownload }){
    if (loading) {
        return <div className="loading">🔍 Searching through research papers...</div>;
    }

    if (!query) {
        return (
            <div className="search-placeholder">
                <p>🎯 Enter a search query to discover relevant research papers</p>
                <p>💡 Try searching by topic, author, methodology, or research questions</p>
            </div>
        );
    }

    if (results.length === 0 && query) {
        return (
            <div className="no-results">
                <h3>❌ No results found for "{query}"</h3>
                <p>Suggestions:</p>
                <ul>
                    <li>Try using different keywords or phrases</li>
                    <li>Use more specific research terms</li>
                    <li>Check your spelling</li>
                    <li>Try broader search terms</li>
                    <li>Adjust your filters</li>
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
                            <th>Title & Details</th>
                            <th>Authors</th>
                            <th>Journal/Conference</th>
                            <th>Category</th>
                            <th>Project Name</th>
                            <th>Project Status</th>
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
                                        <div className="paper-meta">
                                            {result.category && (
                                                <span className="meta-tag category">
                                                    📁 {result.category}
                                                </span>
                                            )}
                                            {result.publication_date && (
                                                <span className="meta-tag">
                                                    📅 {new Date(result.publication_date).toLocaleDateString()}
                                                </span>
                                            )}
                                            {result.keywords && result.keywords.length > 0 && (
                                                <span className="meta-tag">
                                                    🔖 {result.keywords.slice(0, 2).join(', ')}
                                                    {result.keywords.length > 2 && '...'}
                                                </span>
                                            )}
                                        </div>
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
                                <td className="category-column">
                                    {result.category ? (
                                        <span className="category-badge">
                                            {result.category}
                                        </span>
                                    ) : (
                                        'N/A'
                                    )}
                                </td>
                                <td className="project-name-column">
                                    {result.project_name || 'N/A'}
                                </td>
                                <td className="project-status-column">
                                    {result.project_status ? (
                                        <span className={`project-status ${result.project_status}`}>
                                            {result.project_status}
                                        </span>
                                    ) : (
                                        'N/A'
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