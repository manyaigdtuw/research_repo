import React, { useState } from "react";
import { searchPapers } from "../api";
import SearchResults from "./SearchResults";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchStats, setSearchStats] = useState(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setSearchStats(null);
        try {
            const startTime = performance.now();
            const res = await searchPapers(query);
            const endTime = performance.now();
            
            setResults(res.data.results);
            setSearchStats({
                time: res.data.search_time.toFixed(2),
                count: res.data.total_count
            });
        } catch (error) {
            console.error("Search failed:", error);
            alert("Search failed. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className="search-page">
            <div className="portal-header">
                <p>Discover research papers using semantic search</p>
            </div>

            <div className="search-box-container">
                <div className="search-box">
                    <input 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="Search research papers using natural language..." 
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={loading}>
                        {loading ? "🔍 Searching..." : "🔍 Search"}
                    </button>
                </div>
            </div>

            {searchStats && (
                <div className="search-stats">
                    Found {searchStats.count} results ({searchStats.time} seconds)
                </div>
            )}

            <SearchResults results={results} query={query} loading={loading} />
        </div>
    );
}