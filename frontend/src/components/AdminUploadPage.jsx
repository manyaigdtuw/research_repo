import React, { useState, useEffect } from "react";
import { uploadResearchPaper, getProjects, createProject } from "../api";

export default function AdminUploadPage() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [showProjectForm, setShowProjectForm] = useState(false);
    const [newProject, setNewProject] = useState({
        name: "",
        description: "",
        investigatory_team: [""],
        status: "ongoing",
        date_initialized: new Date().toISOString().split('T')[0],
        date_completed: ""
    });
    const [selectedProject, setSelectedProject] = useState("");
    const [metadata, setMetadata] = useState({
        title: "",
        authors: [""],
        abstract: "",
        journal: "",
        publication_date: "",
        keywords: [""],
        category: ""
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

    const handleTeamMemberChange = (index, value) => {
        const updatedTeam = [...newProject.investigatory_team];
        updatedTeam[index] = value;
        setNewProject({ ...newProject, investigatory_team: updatedTeam });
    };

    const addTeamMember = () => {
        setNewProject({
            ...newProject,
            investigatory_team: [...newProject.investigatory_team, ""]
        });
    };

    const removeTeamMember = (index) => {
        const updatedTeam = newProject.investigatory_team.filter((_, i) => i !== index);
        setNewProject({ ...newProject, investigatory_team: updatedTeam });
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

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            const projectData = {
                ...newProject,
                date_initialized: new Date(newProject.date_initialized),
                date_completed: newProject.status === "completed" ? new Date(newProject.date_completed) : null
            };
            await createProject(projectData);
            await loadProjects();
            setShowProjectForm(false);
            setNewProject({
                name: "",
                description: "",
                investigatory_team: [""],
                status: "ongoing",
                date_initialized: new Date().toISOString().split('T')[0],
                date_completed: ""
            });
        } catch (error) {
            console.error("Failed to create project:", error);
        }
    };

// AdminUploadPage.jsx - Update handleSubmit
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
        
        // Send project_id as query parameter instead of form data
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
            category: ""
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
            <div className="page-header">
                <h2>Upload Research Document</h2>
                <p>Manage research papers and associate them with projects</p>
            </div>

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
                                    <button 
                                        type="button" 
                                        className="btn-secondary"
                                        onClick={() => setShowProjectForm(true)}
                                    >
                                        + New Project
                                    </button>
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
                                <label>Category</label>
                                <select 
                                    value={metadata.category}
                                    onChange={(e) => setMetadata({...metadata, category: e.target.value})}
                                >
                                    <option value="">Select category...</option>
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

                {/* New Project Modal */}
                {showProjectForm && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Create New Project</h3>
                                <button onClick={() => setShowProjectForm(false)} className="close-btn">×</button>
                            </div>
                            <form onSubmit={handleCreateProject}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Project Name *</label>
                                        <input
                                            type="text"
                                            value={newProject.name}
                                            onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select 
                                            value={newProject.status}
                                            onChange={(e) => setNewProject({...newProject, status: e.target.value})}
                                        >
                                            <option value="ongoing">Ongoing</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Date Initialized *</label>
                                        <input
                                            type="date"
                                            value={newProject.date_initialized}
                                            onChange={(e) => setNewProject({...newProject, date_initialized: e.target.value})}
                                            required
                                        />
                                    </div>
                                    {newProject.status === "completed" && (
                                        <div className="form-group">
                                            <label>Date Completed</label>
                                            <input
                                                type="date"
                                                value={newProject.date_completed}
                                                onChange={(e) => setNewProject({...newProject, date_completed: e.target.value})}
                                            />
                                        </div>
                                    )}
                                    <div className="form-group full-width">
                                        <label>Investigatory Team</label>
                                        {newProject.investigatory_team.map((member, index) => (
                                            <div key={index} className="array-input">
                                                <input
                                                    type="text"
                                                    value={member}
                                                    onChange={(e) => handleTeamMemberChange(index, e.target.value)}
                                                    placeholder={`Team member ${index + 1}`}
                                                />
                                                {newProject.investigatory_team.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeTeamMember(index)}
                                                        className="remove-btn"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                                {index === newProject.investigatory_team.length - 1 && (
                                                    <button type="button" onClick={addTeamMember} className="add-btn">+</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Description</label>
                                        <textarea
                                            value={newProject.description}
                                            onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                                            rows="3"
                                            placeholder="Project description..."
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowProjectForm(false)} className="btn-secondary">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Create Project
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}