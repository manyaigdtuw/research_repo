import React, { useState, useEffect } from "react";
import { uploadResearchPaper, getProjects } from "../api";

export default function AdminUploadPage() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [metadata, setMetadata] = useState({
        title: "",
        authors: [""],
        abstract: "",
        journal: "",
        publication_date: "",
        keywords: [""],
        category: "research_fundamental"
    });

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const response = await getProjects();
            setProjects(response.data);
        } catch (error) {
            console.error("Failed to load projects:", error);
        }
    };

    const handleAuthorChange = (index, value) => {
        const updatedAuthors = [...metadata.authors];
        updatedAuthors[index] = value;
        setMetadata({ ...metadata, authors: updatedAuthors });
    };

    const addAuthor = () => {
        setMetadata({ ...metadata, authors: [...metadata.authors, ""] });
    };

    const removeAuthor = (index) => {
        const updatedAuthors = metadata.authors.filter((_, i) => i !== index);
        setMetadata({ ...metadata, authors: updatedAuthors });
    };

    const handleKeywordChange = (index, value) => {
        const updatedKeywords = [...metadata.keywords];
        updatedKeywords[index] = value;
        setMetadata({ ...metadata, keywords: updatedKeywords });
    };

    const addKeyword = () => {
        setMetadata({ ...metadata, keywords: [...metadata.keywords, ""] });
    };

    const removeKeyword = (index) => {
        const updatedKeywords = metadata.keywords.filter((_, i) => i !== index);
        setMetadata({ ...metadata, keywords: updatedKeywords });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            alert("Please select a file");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            
            // Format the date properly for backend
            let formattedDate = "";
            if (metadata.publication_date) {
                const date = new Date(metadata.publication_date);
                formattedDate = date.toISOString();
            }
            
            // Append all metadata as form data - use exact field names expected by backend
            formData.append("title", metadata.title);
            formData.append("authors", JSON.stringify(metadata.authors.filter(author => author.trim() !== "")));
            formData.append("abstract", metadata.abstract);
            formData.append("journal", metadata.journal);
            formData.append("publication_date", formattedDate);
            formData.append("keywords", JSON.stringify(metadata.keywords.filter(keyword => keyword.trim() !== "")));
            formData.append("category", metadata.category);
            
            // Send project_id as query parameter if selected
            const config = {};
            if (selectedProject) {
                config.params = { project_id: selectedProject };
            }
            
            await uploadResearchPaper(formData, config);
            alert("Research paper uploaded successfully!");
            // Reset form
            setFile(null);
            setSelectedProject("");
            setMetadata({
                title: "",
                authors: [""],
                abstract: "",
                journal: "",
                publication_date: "",
                keywords: [""],
                category: "research_fundamental"
            });
            document.getElementById("file-input").value = "";
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed. Please try again.");
        }
        setUploading(false);
    };

    return (
        <div className="admin-upload-page">

            <div className="upload-container">
                <form onSubmit={handleSubmit} className="upload-form">
                    {/* Project Selection */}
                    <div className="form-section">
                        <h3>Project Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Select Project (Optional)</label>
                                <div className="project-selector">
                                    <select 
                                        value={selectedProject} 
                                        onChange={(e) => setSelectedProject(e.target.value)}
                                    >
                                        <option value="">Choose a project...</option>
                                        {projects.map(project => (
                                            <option key={project.id} value={project.id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Document Metadata */}
                    <div className="form-section">
                        <h3>Document Metadata</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={metadata.title}
                                    onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Category *</label>
                                <select 
                                    value={metadata.category}
                                    onChange={(e) => setMetadata({...metadata, category: e.target.value})}
                                    required
                                >
                                    <option value="clinical">Clinical</option>
                                    <option value="research_fundamental">Research Fundamental</option>
                                    <option value="applied_research">Applied Research</option>
                                    <option value="case_study">Case Study</option>
                                    <option value="review">Review</option>
                                    <option value="methodology">Methodology</option>
                                </select>
                            </div>
                            <div className="form-group full-width">
                                <label>Authors</label>
                                {metadata.authors.map((author, index) => (
                                    <div key={index} className="array-input">
                                        <input
                                            type="text"
                                            value={author}
                                            onChange={(e) => handleAuthorChange(index, e.target.value)}
                                            placeholder={`Author ${index + 1}`}
                                        />
                                        {metadata.authors.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeAuthor(index)}
                                                className="remove-btn"
                                            >
                                                ×
                                            </button>
                                        )}
                                        {index === metadata.authors.length - 1 && (
                                            <button type="button" onClick={addAuthor} className="add-btn">+</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="form-group">
                                <label>Journal/Conference</label>
                                <input
                                    type="text"
                                    value={metadata.journal}
                                    onChange={(e) => setMetadata({...metadata, journal: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Publication Date</label>
                                <input
                                    type="date"
                                    value={metadata.publication_date}
                                    onChange={(e) => setMetadata({...metadata, publication_date: e.target.value})}
                                />
                            </div>
                            <div className="form-group full-width">
                                <label>Keywords</label>
                                {metadata.keywords.map((keyword, index) => (
                                    <div key={index} className="array-input">
                                        <input
                                            type="text"
                                            value={keyword}
                                            onChange={(e) => handleKeywordChange(index, e.target.value)}
                                            placeholder={`Keyword ${index + 1}`}
                                        />
                                        {metadata.keywords.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeKeyword(index)}
                                                className="remove-btn"
                                            >
                                                ×
                                            </button>
                                        )}
                                        {index === metadata.keywords.length - 1 && (
                                            <button type="button" onClick={addKeyword} className="add-btn">+</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="form-group full-width">
                                <label>Abstract</label>
                                <textarea
                                    value={metadata.abstract}
                                    onChange={(e) => setMetadata({...metadata, abstract: e.target.value})}
                                    rows="4"
                                    placeholder="Enter the abstract..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="form-section">
                        <h3>Document File</h3>
                        <div className="form-group">
                            <label htmlFor="file-input">Select PDF Document *</label>
                            <input 
                                id="file-input"
                                type="file" 
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files[0])} 
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={uploading} className="submit-btn">
                        {uploading ? "Uploading..." : "Upload Document"}
                    </button>
                </form>
            </div>
        </div>
    );
}