import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { reviewService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const StarRating = ({ rating, onRate, interactive = false }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`fa-star ${
            (interactive ? (hovered || rating) : rating) >= star ? 'fas text-warning' : 'far text-muted'
          }`}
          style={interactive ? { cursor: 'pointer', fontSize: '1.5rem' } : {}}
          onClick={() => interactive && onRate(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
        ></i>
      ))}
    </span>
  );
};

const DoctorReviews = ({ doctorId: propDoctorId }) => {
  const { id: paramDoctorId } = useParams();
  const doctorId = propDoctorId || paramDoctorId;
  const { isAuthenticated, user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Review form state
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [formAnonymous, setFormAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const response = await reviewService.getByDoctor(doctorId);
      const data = response.data.results || response.data;
      setReviews(Array.isArray(data) ? data : []);

      // Calculate average rating
      const reviewList = Array.isArray(data) ? data : [];
      setReviewCount(reviewList.length);
      if (reviewList.length > 0) {
        const avg = reviewList.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewList.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setAverageRating(0);
      }
      setLoading(false);
    } catch (err) {
      setError('Error fetching reviews');
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (formRating === 0) {
      setError('Please select a rating');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const reviewData = {
        doctor: doctorId,
        rating: formRating,
        comment: formComment,
        is_anonymous: formAnonymous,
      };
      await reviewService.create(reviewData);
      setSuccessMsg('Review submitted successfully!');
      setFormRating(0);
      setFormComment('');
      setFormAnonymous(false);
      setShowForm(false);
      fetchReviews();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error submitting review');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">
        <i className="fas fa-star me-2"></i>
        Doctor Reviews
      </h2>

      {/* Average Rating Summary */}
      <div className="card shadow-sm mb-4">
        <div className="card-body text-center">
          <div className="row align-items-center">
            <div className="col-md-4">
              <h1 className="display-3 fw-bold text-warning mb-0">{averageRating}</h1>
              <StarRating rating={Math.round(averageRating)} />
              <p className="text-muted mt-2">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</p>
            </div>
            <div className="col-md-4">
              {/* Rating breakdown */}
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter(r => Math.round(r.rating) === star).length;
                const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                return (
                  <div key={star} className="d-flex align-items-center mb-1">
                    <span className="me-2" style={{ minWidth: '20px' }}>{star}</span>
                    <i className="fas fa-star text-warning me-2"></i>
                    <div className="progress flex-grow-1" style={{ height: '8px' }}>
                      <div className="progress-bar bg-warning" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="ms-2 text-muted" style={{ minWidth: '30px' }}>{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="col-md-4">
              {isAuthenticated && (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowForm(!showForm)}
                >
                  <i className="fas fa-pen me-2"></i>
                  Write a Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Write Review Form */}
      {showForm && isAuthenticated && (
        <div className="card shadow-sm mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-edit me-2"></i>
              Write Your Review
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmitReview}>
              <div className="mb-3">
                <label className="form-label fw-bold">Your Rating</label>
                <div>
                  <StarRating rating={formRating} onRate={setFormRating} interactive />
                  {formRating > 0 && (
                    <span className="ms-2 text-muted">{formRating} / 5</span>
                  )}
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="reviewComment" className="form-label fw-bold">Your Review</label>
                <textarea
                  id="reviewComment"
                  className="form-control"
                  rows="4"
                  placeholder="Share your experience with this doctor..."
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  required
                ></textarea>
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="anonymousCheck"
                  checked={formAnonymous}
                  onChange={(e) => setFormAnonymous(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="anonymousCheck">
                  Submit anonymously
                </label>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>
                      Submit Review
                    </>
                  )}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : reviews.length === 0 ? (
        <div className="alert alert-info">
          <i className="fas fa-comment-slash me-2"></i>
          No reviews yet. Be the first to review this doctor!
        </div>
      ) : (
        <div className="list-group">
          {reviews.map((review) => (
            <div key={review.id} className="list-group-item mb-2 rounded shadow-sm">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="d-flex align-items-center mb-2">
                    <div className="me-3">
                      <i className="fas fa-user-circle fa-2x text-secondary"></i>
                    </div>
                    <div>
                      <h6 className="mb-0">
                        {review.is_anonymous
                          ? 'Anonymous'
                          : review.patient_name || `${review.patient?.first_name || ''} ${review.patient?.last_name || ''}`.trim() || 'Patient'}
                      </h6>
                      <small className="text-muted">
                        <i className="fas fa-calendar me-1"></i>
                        {formatDate(review.created_at)}
                      </small>
                    </div>
                  </div>
                </div>
                <div>
                  <StarRating rating={review.rating} />
                  <span className="ms-2 fw-bold">{review.rating}/5</span>
                </div>
              </div>
              <p className="mb-0 mt-2">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorReviews;
