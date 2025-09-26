import axios from "axios";

const API_BASE = "http://localhost:8000/api";
//const API_BASE = "http://localhost:7777/api";
//const API_BASE = "https://9364717f2ef5.ngrok-free.app/api";



export const uploadResearchPaper = (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axios.post(`${API_BASE}/upload`, formData);
};

export const searchPapers = (query, top_k = 10) => {
    return axios.get(`${API_BASE}/search`, { 
        params: { query, top_k } 
    });
};

export const getAllPapers = () => axios.get(`${API_BASE}/papers`);
export const getPaper = (paperId) => axios.get(`${API_BASE}/papers/${paperId}`);
export const deletePaper = (paperId) => axios.delete(`${API_BASE}/papers/${paperId}`);
export const downloadPaper = (paperId) => {
    return axios.get(`${API_BASE}/download/${paperId}`, {
        responseType: 'blob'
    });
};