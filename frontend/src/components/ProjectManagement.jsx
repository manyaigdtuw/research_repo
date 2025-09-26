import React, { useState, useEffect } from 'react';
import { createProject, getProjects } from '../api';

const ProjectManagement = () => {
    const [projects, setProjects] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        investigatory_team: [''],
        status: 'ongoing',
        date_initialized: new Date().toISOString().split('T')[0],
        date_completed: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await getProjects();
            setProjects(response.data);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTeamMemberChange = (index, value) => {
        const newTeam = [...formData.investigatory_team];
        newTeam[index] = value;
        setFormData(prev => ({
            ...prev,
            investigatory_team: newTeam
        }));
    };

    const addTeamMember = () => {
        setFormData(prev => ({
            ...prev,
            investigatory_team: [...prev.investigatory_team, '']
        }));
    };

    const removeTeamMember = (index) => {
        if (formData.investigatory_team.length > 1) {
            const newTeam = formData.investigatory_team.filter((_, i) => i !== index);
            setFormData(prev => ({
                ...prev,
                investigatory_team: newTeam
            }));
        }
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
        // Filter out empty team members
        const filteredTeam = formData.investigatory_team.filter(member => member.trim() !== '');
        if (filteredTeam.length === 0) {
            alert('Please add at least one team member.');
            setLoading(false);
            return;
        }

        // Prepare data to send
        const submitData = {
            ...formData,
            investigatory_team: filteredTeam,
            date_initialized: new Date(formData.date_initialized).toISOString(),
            ...(formData.status === 'completed' && formData.date_completed
                ? { date_completed: new Date(formData.date_completed).toISOString() }
                : {})
        };

        // Make API request
        await createProject(submitData);

        // Reset form and refresh projects
        setShowForm(false);
        setFormData({
            name: '',
            description: '',
            investigatory_team: [''],
            status: 'ongoing',
            date_initialized: new Date().toISOString().split('T')[0],
            date_completed: ''
        });
        fetchProjects();
        alert('Project created successfully!');
    } catch (error) {
        console.error('Backend validation errors:', error.response?.data);

        // Display detailed backend errors
        if (error.response?.data?.detail) {
            const messages = error.response.data.detail.map((err) => {
                const loc = err.loc.join(' > ');
                return `${loc}: ${err.msg}`;
            }).join('\n');
            alert('Error creating project:\n' + messages);
        } else {
            alert('Error creating project: ' + error.message);
        }
    } finally {
        setLoading(false);
    }
};


    return (
        <div className="project-management">

            <div className="projects-section">
                <div className="section-header">
                    <h3>Existing Projects</h3>
                    <button 
                        className="btn-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? 'Cancel' : 'Add New Project'}
                    </button>
                </div>

                {showForm && (
                    <div className="project-form-container">
                        <form onSubmit={handleSubmit} className="project-form">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Project Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Status *</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                    >
                                        <option value="ongoing">Ongoing</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Date Initialized *</label>
                                    <input
                                        type="date"
                                        name="date_initialized"
                                        value={formData.date_initialized}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                {formData.status === 'completed' && (
                                    <div className="form-group">
                                        <label>Date Completed</label>
                                        <input
                                            type="date"
                                            name="date_completed"
                                            value={formData.date_completed}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                )}

                                <div className="form-group full-width">
                                    <label>Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="3"
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label>Investigatory Team *</label>
                                    {formData.investigatory_team.map((member, index) => (
                                        <div key={index} className="array-input">
                                            <input
                                                type="text"
                                                value={member}
                                                onChange={(e) => handleTeamMemberChange(index, e.target.value)}
                                                placeholder="Team member name"
                                                required
                                            />
                                            {formData.investigatory_team.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="remove-btn"
                                                    onClick={() => removeTeamMember(index)}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="add-btn"
                                        onClick={addTeamMember}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button 
                                    type="submit" 
                                    className="btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="projects-grid">
                    {projects.length === 0 ? (
                        <div className="no-projects">
                            <p>No projects found. Create your first project!</p>
                        </div>
                    ) : (
                        projects.map(project => (
                            <div key={project.id} className="project-card">
                                <div className="project-header">
                                    <h4>{project.name}</h4>
                                    <span className={`status-badge ${project.status}`}>
                                        {project.status}
                                    </span>
                                </div>
                                <p className="project-description">{project.description}</p>
                                <div className="project-details">
                                    <div className="detail-item">
                                        <strong>Team:</strong> {project.investigatory_team.join(', ')}
                                    </div>
                                    <div className="detail-item">
                                        <strong>Started:</strong> {new Date(project.date_initialized).toLocaleDateString()}
                                    </div>
                                    {project.date_completed && (
                                        <div className="detail-item">
                                            <strong>Completed:</strong> {new Date(project.date_completed).toLocaleDateString()}
                                        </div>
                                    )}
                                    <div className="detail-item">
                                        <strong>Created:</strong> {new Date(project.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectManagement;