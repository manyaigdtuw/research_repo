import React, { useState } from "react";
import { uploadResearchPaper } from "../api";

export default function UploadPage() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            alert("Please select a PDF file");
            return;
        }

        setUploading(true);
        try {
            const res = await uploadResearchPaper(file);
            alert(`Research paper uploaded successfully! Paper ID: ${res.data.paper_id}`);
            setFile(null);
            document.getElementById("file-input").value = "";
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed. Please try again.");
        }
        setUploading(false);
    };

    return (
        <div className="upload-page">
            <h2>Upload Research Paper</h2>
            
            <form onSubmit={handleSubmit} className="upload-form">
                <div className="form-group">
                    <label htmlFor="file-input">Select Research Paper (PDF):</label>
                    <input 
                        id="file-input"
                        type="file" 
                        accept=".pdf"
                        onChange={(e) => setFile(e.target.files[0])} 
                        required
                    />
                </div>

                <button type="submit" disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload Research Paper"}
                </button>
            </form>

            {file && (
                <div className="file-info">
                    <p>Selected file: {file.name}</p>
                    <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
            )}
        </div>
    );
}