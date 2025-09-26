import React, { useState, useEffect } from "react";
import { getProjects, createProject, getAllPapers } from "../api";

export default function ProjectManagement() {
    const [projects, setProjects] = useState([]);
    const [papers, setPapers] = useState([]);
    const [showProjectForm, setShowProjectForm] = useState(false);
    const [newProject, setNewProject] = useState({
        name: "",
        description: "",
        investigatory_team: [""],
        status: "ongoing",
        date_initialized: new Date().toISOString().split('T')[0],
        date_completed: ""
    });

    useEffect(() => {
        loadProjects();
        loadPapers();
    }, []);

    const loadProjects = async () => {
        try {
            const response = await getProjects();
            setProjects(response.data);
        } catch (error) {
            console.error("Failed to load projects:", error);
        }
    };

    const loadPapers = async () => {
        try {
            const response = await getAllPapers();
            setPapers(response.data);
        } catch (error) {
            console.error("Failed to load papers:", error);
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
            alert("Failed to create project. Please try again.");
        }
    };

    const getPapersByProject = (projectId) => {
        return papers.filter(paper => paper.project_id === projectId);
    };

    return (
        <div className="project-management">
            <div className="page-header">
                <h2>Project Management</h2>
                <p>Manage research projects and their associated documents</p>
                <button 
                    className="btn-primary"
                    onClick={() => setShowProjectForm(true)}
                >
                    + Create New Project
                </button>
            </div>

            <div className="projects-grid">
                {projects.map(project => (
                    <div key={project.id} className="project-card">
                        <div className="project-header">
                            <h3>{project.name}</h3>
                            <span className={`status-badge ${project.status}`}>
                                {project.status}
                            </span>
                        </div>
                        
                        <div className="project-details">
                            <p className="project-description">{project.description}</p>
                            
                            <div className="project-meta">
                                <div className="meta-item">
                                    <strong>Team:</strong>
                                    <div className="team-members">
                                        {project.investigatory_team.map((member, idx) => (
                                            <span key={idx} className="team-member">{member}</span>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="meta-item">
                                    <strong>Initialized:</strong>
                                    <span>{new Date(project.date_initialized).toLocaleDateString()}</span>
                                </div>
                                
                                {project.status === "completed" && project.date_completed && (
                                    <div className="meta-item">
                                        <strong>Completed:</strong>
                                        <span>{new Date(project.date_completed).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="project-papers">
                            <h4>Associated Papers ({getPapersByProject(project.id).length})</h4>
                            {getPapersByProject(project.id).length > 0 ? (
                                <ul>
                                    {getPapersByProject(project.id).map(paper => (
                                        <li key={paper.id}>{paper.title}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="no-papers">No papers associated with this project</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Project Creation Modal */}
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
    );
}