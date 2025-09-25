import React, { useState } from "react";
import { searchDocuments } from "../../../api";

export default function SearchBox() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);

    const handleSearch = async () => {
        const res = await searchDocuments(query);
        setResults(res.data);
    };

    return (
        <div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />
            <button onClick={handleSearch}>Search</button>
            <ul>
                {results.map(r => <li key={r.id}>{r.filename}: {r.snippet}...</li>)}
            </ul>
        </div>
    );
}
