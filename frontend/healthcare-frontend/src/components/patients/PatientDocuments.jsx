import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { documentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DOCUMENT_TYPES = [
  { value: 'INSURANCE_CARD', label: 'Insurance Card' },
  { value: 'ID_PROOF', label: 'ID Proof' },
  { value: 'LAB_REPORT', label: 'Lab Report' },
  { value: 'PRESCRIPTION', label: 'Prescription' },
  { value: 'IMAGING', label: 'Imaging' },
  { value: 'DISCHARGE_SUMMARY', label: 'Discharge Summary' },
  { value: 'OTHER', label: 'Other' },
];

const PatientDocuments = ({ patientId: propPatientId }) => {
  const { id: paramPatientId } = useParams();
  const patientId = propPatientId || paramPatientId;
  const { isAuthenticated } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    document_type: 'OTHER',
    description: '',
    file: null,
  });

  const fetchDocuments = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const response = await documentService.getByPatient(patientId);
      const data = response.data.results || response.data;
      setDocuments(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      setError('Error fetching documents');
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, file: e.target.files[0] }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      setError('Please select a file');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploadData = {
        title: formData.title,
        document_type: formData.document_type,
        description: formData.description,
        file: formData.file,
        patient: patientId,
      };
      await documentService.create(uploadData);
      setSuccessMsg('Document uploaded successfully!');
      setFormData({ title: '', document_type: 'OTHER', description: '', file: null });
      setShowUploadForm(false);
      fetchDocuments();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error uploading document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await documentService.delete(id);
        setDocuments(documents.filter(d => d.id !== id));
        setSuccessMsg('Document deleted successfully');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        setError('Error deleting document');
      }
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'INSURANCE_CARD': return 'bg-primary';
      case 'ID_PROOF': return 'bg-info';
      case 'LAB_REPORT': return 'bg-success';
      case 'PRESCRIPTION': return 'bg-warning text-dark';
      case 'IMAGING': return 'bg-purple';
      case 'DISCHARGE_SUMMARY': return 'bg-secondary';
      default: return 'bg-dark';
    }
  };

  const getTypeLabel = (type) => {
    const found = DOCUMENT_TYPES.find(dt => dt.value === type);
    return found ? found.label : type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-file-medical me-2"></i>
          Patient Documents
        </h2>
        {isAuthenticated && (
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadForm(!showUploadForm)}
          >
            <i className="fas fa-upload me-2"></i>
            Upload Document
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="card shadow-sm mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-cloud-upload-alt me-2"></i>
              Upload New Document
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleUpload}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="docTitle" className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="docTitle"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Blood Test Results - June 2026"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="docType" className="form-label">Document Type *</label>
                  <select
                    className="form-select"
                    id="docType"
                    name="document_type"
                    value={formData.document_type}
                    onChange={handleInputChange}
                    required
                  >
                    {DOCUMENT_TYPES.map(dt => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="docFile" className="form-label">File *</label>
                  <input
                    type="file"
                    className="form-control"
                    id="docFile"
                    onChange={handleFileChange}
                    required
                  />
                  <div className="form-text">
                    Accepted formats: PDF, JPG, PNG, DOCX. Max size: 10MB.
                  </div>
                </div>
                <div className="col-12">
                  <label htmlFor="docDesc" className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    id="docDesc"
                    name="description"
                    rows="2"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Optional description of the document..."
                  ></textarea>
                </div>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload me-2"></i>
                      Upload
                    </>
                  )}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowUploadForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents Table */}
      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : documents.length === 0 ? (
        <div className="alert alert-info">
          <i className="fas fa-folder-open me-2"></i>
          No documents found for this patient.
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0">
              <thead className="table-primary">
                <tr>
                  <th><i className="fas fa-file me-1"></i> Title</th>
                  <th>Type</th>
                  <th>Upload Date</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <i className="fas fa-file-alt me-2 text-primary"></i>
                      {doc.title}
                    </td>
                    <td>
                      <span className={`badge ${getTypeBadgeClass(doc.document_type)}`}>
                        {getTypeLabel(doc.document_type)}
                      </span>
                    </td>
                    <td>{formatDate(doc.uploaded_at || doc.created_at)}</td>
                    <td>
                      <span className="text-muted">
                        {doc.description ? (doc.description.length > 50 ? doc.description.substring(0, 50) + '...' : doc.description) : '-'}
                      </span>
                    </td>
                    <td>
                      {doc.file && (
                        <a
                          href={doc.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary me-2"
                          title="Download"
                        >
                          <i className="fas fa-download"></i>
                        </a>
                      )}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(doc.id)}
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDocuments;
