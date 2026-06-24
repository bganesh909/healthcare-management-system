import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  departmentService,
  doctorService,
  appointmentService,
  patientService,
  reviewService,
  doctorLeaveService,
  authService,
} from '../../services/api';
import './BookAppointment.css';

const STEPS = ['Your Problem', 'Department', 'Doctor', 'Date & Time', 'Patient Details', 'Confirm'];

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DEPARTMENT_ICONS = {
  cardiology: 'fa-heart-pulse',
  neurology: 'fa-brain',
  orthopedics: 'fa-bone',
  oncology: 'fa-ribbon',
  pediatrics: 'fa-baby',
  gynecology: 'fa-venus',
  emergency: 'fa-truck-medical',
  'general medicine': 'fa-stethoscope',
  ophthalmology: 'fa-eye',
  dermatology: 'fa-hand-dots',
  psychiatry: 'fa-head-side-virus',
  gastroenterology: 'fa-stomach',
  ent: 'fa-ear-listen',
  urology: 'fa-kidneys',
  radiology: 'fa-x-ray',
  pathology: 'fa-microscope',
  pulmonology: 'fa-lungs',
  nephrology: 'fa-filter',
  endocrinology: 'fa-dna',
  dental: 'fa-tooth',
};

const getDeptIcon = (name) => {
  if (!name) return 'fa-hospital';
  const key = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(DEPARTMENT_ICONS)) {
    if (key.includes(k)) return v;
  }
  return 'fa-hospital';
};

const formatTime12 = (t) => {
  if (!t) return t;
  const parts = t.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const BookAppointment = () => {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 state - Symptoms
  const [symptoms, setSymptoms] = useState('');
  const [suggestedDoctors, setSuggestedDoctors] = useState([]);
  const [suggestedSpecs, setSuggestedSpecs] = useState([]);
  const [symptomSearching, setSymptomSearching] = useState(false);

  // Step 2 state
  const [departments, setDepartments] = useState([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptDoctorCounts, setDeptDoctorCounts] = useState({});

  // Step 2 state
  const [doctors, setDoctors] = useState([]);
  const [doctorRatings, setDoctorRatings] = useState({});
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Step 3 state
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [doctorLeaves, setDoctorLeaves] = useState([]);

  // Step 4 state
  const [patientData, setPatientData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    address: '',
  });
  const [reason, setReason] = useState('');
  const [existingPatientId, setExistingPatientId] = useState(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [phoneSearchResult, setPhoneSearchResult] = useState(null);
  const [searchingPhone, setSearchingPhone] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Step 5 state
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // General
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check login status
  useEffect(() => {
    setIsLoggedIn(authService.isAuthenticated());
  }, []);

  // Step 2: Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);
      try {
        const result = await departmentService.getAll();
        setDepartments(result.data || []);
        // Fetch all doctors to compute counts per department
        const docResult = await doctorService.getAll({ page_size: 500 });
        const allDocs = docResult.data || [];
        const counts = {};
        allDocs.forEach((d) => {
          const deptId = d.department || d.department_id;
          if (deptId) counts[deptId] = (counts[deptId] || 0) + 1;
        });
        setDeptDoctorCounts(counts);
      } catch (err) {
        setError('Failed to load departments. Please try again.');
      }
      setLoading(false);
    };
    fetchDepartments();
  }, []);

  // Step 3: Fetch doctors when department selected
  useEffect(() => {
    if (!selectedDept) return;
    const fetchDoctors = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await doctorService.getAll({ department: selectedDept.id, page_size: 100 });
        const docs = result.data || [];
        setDoctors(docs);
        // Fetch ratings for each doctor
        const ratings = {};
        await Promise.all(
          docs.map(async (doc) => {
            try {
              const rev = await reviewService.getByDoctor(doc.id);
              const reviews = rev.data?.results || rev.data || [];
              if (reviews.length > 0) {
                const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
                ratings[doc.id] = { avg: Math.round(avg * 10) / 10, count: reviews.length };
              }
            } catch {
              // No reviews
            }
          })
        );
        setDoctorRatings(ratings);
      } catch (err) {
        setError('Failed to load doctors.');
      }
      setLoading(false);
    };
    fetchDoctors();
  }, [selectedDept]);

  // Step 4: Fetch leaves when doctor selected
  useEffect(() => {
    if (!selectedDoctor) return;
    const fetchLeaves = async () => {
      try {
        const result = await doctorLeaveService.getAll({ doctor: selectedDoctor.id });
        setDoctorLeaves(result.data || []);
      } catch {
        setDoctorLeaves([]);
      }
    };
    fetchLeaves();
  }, [selectedDoctor]);

  // Step 4: Fetch available slots when date selected
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    const fetchSlots = async () => {
      setLoading(true);
      setError('');
      try {
        const dateStr = formatDateISO(selectedDate);
        const response = await appointmentService.getAvailableSlots(selectedDoctor.id, dateStr);
        const slots = response.data?.available_slots || response.data?.slots || response.data || [];
        setAvailableSlots(Array.isArray(slots) ? slots : []);
      } catch {
        setAvailableSlots([]);
      }
      setLoading(false);
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // Pre-fill patient data if logged in
  useEffect(() => {
    if (isLoggedIn && currentStep === 5) {
      const fetchProfile = async () => {
        try {
          const resp = await authService.getProfile();
          const profile = resp.data;
          if (profile) {
            setPatientData((prev) => ({
              ...prev,
              first_name: profile.first_name || prev.first_name,
              last_name: profile.last_name || prev.last_name,
              email: profile.email || prev.email,
              phone_number: profile.phone_number || prev.phone_number,
            }));
            if (profile.patient_id) {
              setExistingPatientId(profile.patient_id);
            }
          }
        } catch {
          // Ignore
        }
      };
      fetchProfile();
    }
  }, [isLoggedIn, currentStep]);

  const formatDateISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getNext30Days = useCallback(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const isLeaveDay = (date) => {
    const dateStr = formatDateISO(date);
    return doctorLeaves.some((l) => {
      const start = l.start_date || l.leave_date;
      const end = l.end_date || l.leave_date;
      return dateStr >= start && dateStr <= end;
    });
  };

  // Phone search for existing patient
  const handlePhoneSearch = async () => {
    if (!phoneSearch || phoneSearch.length < 10) return;
    setSearchingPhone(true);
    setPhoneSearchResult(null);
    try {
      const result = await patientService.getAll({ search: phoneSearch });
      const patients = result.data || [];
      if (patients.length > 0) {
        const p = patients[0];
        setPatientData({
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          email: p.email || '',
          phone_number: p.phone_number || p.phone || phoneSearch,
          date_of_birth: p.date_of_birth || '',
          gender: p.gender || '',
          blood_group: p.blood_group || '',
          address: p.address || '',
        });
        setExistingPatientId(p.id);
        setPhoneSearchResult('found');
      } else {
        setPhoneSearchResult('not_found');
      }
    } catch {
      setPhoneSearchResult('not_found');
    }
    setSearchingPhone(false);
  };

  // Confirm booking
  const handleConfirmBooking = async () => {
    setBooking(true);
    setError('');
    try {
      let patientId = existingPatientId;

      // Create patient if new
      if (!patientId) {
        const patientPayload = {
          first_name: patientData.first_name,
          last_name: patientData.last_name,
          email: patientData.email || undefined,
          phone_number: patientData.phone_number,
          date_of_birth: patientData.date_of_birth || undefined,
          gender: patientData.gender || undefined,
          blood_group: patientData.blood_group || undefined,
          address: patientData.address || undefined,
        };
        const patientResp = await patientService.create(patientPayload);
        patientId = patientResp.data?.id || patientResp.data?.patient_id;
      }

      if (!patientId) {
        setError('Failed to create patient record. Please try again.');
        setBooking(false);
        return;
      }

      // Create appointment
      const appointmentPayload = {
        patient: patientId,
        doctor: selectedDoctor.id,
        appointment_date: formatDateISO(selectedDate),
        appointment_time: selectedSlot,
        symptoms: symptoms || '',
        reason: reason || symptoms || 'General consultation',
        status: 'SCHEDULED',
      };

      const appointmentResp = await appointmentService.create(appointmentPayload);
      setBookingResult({
        ...appointmentResp.data,
        patientName: `${patientData.first_name} ${patientData.last_name}`,
        doctorName: selectedDoctor.user?.first_name
          ? `Dr. ${selectedDoctor.user.first_name} ${selectedDoctor.user.last_name}`
          : selectedDoctor.name || `Doctor #${selectedDoctor.id}`,
        departmentName: selectedDept.name,
        date: formatDateISO(selectedDate),
        time: selectedSlot,
        fee: selectedDoctor.consultation_fee,
      });
      setBookingSuccess(true);
    } catch (err) {
      const detail = err.response?.data;
      let msg = 'Booking failed. Please try again.';
      if (detail) {
        if (typeof detail === 'string') msg = detail;
        else if (detail.detail) msg = detail.detail;
        else if (detail.non_field_errors) msg = detail.non_field_errors.join(', ');
        else {
          const fieldErrors = Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('; ');
          if (fieldErrors) msg = fieldErrors;
        }
      }
      setError(msg);
    }
    setBooking(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const goToStep = (step) => {
    setError('');
    setCurrentStep(step);
  };

  const getDoctorDisplayName = (doc) => {
    if (doc.user?.first_name) return `Dr. ${doc.user.first_name} ${doc.user.last_name || ''}`.trim();
    if (doc.name) return doc.name;
    if (doc.first_name) return `Dr. ${doc.first_name} ${doc.last_name || ''}`.trim();
    return `Doctor #${doc.id}`;
  };

  const filteredDepts = departments.filter((d) =>
    !deptSearch || (d.name && d.name.toLowerCase().includes(deptSearch.toLowerCase())) ||
    (d.description && d.description.toLowerCase().includes(deptSearch.toLowerCase()))
  );

  const isStep4Valid = () => {
    return patientData.first_name.trim() && patientData.last_name.trim() && patientData.phone_number.trim();
  };

  // ==================== RENDER STEPS ====================

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div className="step-indicator-inner">
        {STEPS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          return (
            <React.Fragment key={stepNum}>
              {idx > 0 && <div className={`step-line${isCompleted ? ' completed' : ''}`} />}
              <div className="step-item">
                <div className={`step-circle${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}>
                  {isCompleted ? <i className="fas fa-check" /> : stepNum}
                </div>
                <span className={`step-label${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}>
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  // ===== STEP 1: DESCRIBE YOUR PROBLEM =====
  const handleSymptomSearch = async () => {
    if (!symptoms.trim()) return;
    setSymptomSearching(true);
    try {
      const resp = await appointmentService.suggestDoctors(symptoms);
      setSuggestedDoctors(resp.data?.doctors || []);
      setSuggestedSpecs(resp.data?.matched_specializations || []);
    } catch {
      setSuggestedDoctors([]);
      setSuggestedSpecs(['GENERAL']);
    }
    setSymptomSearching(false);
  };

  const renderStep1 = () => (
    <div>
      <h3 className="booking-step-title">Describe Your Problem</h3>
      <p className="booking-step-subtitle">Tell us your symptoms and we'll suggest the right doctor for you</p>

      <div className="patient-form-section">
        <div className="mb-3">
          <label className="form-label fw-bold">
            <i className="fas fa-notes-medical me-2 text-primary"></i>
            What health problem are you experiencing? <span className="text-danger">*</span>
          </label>
          <textarea
            className="form-control"
            rows={4}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Example: I have been experiencing chest pain and breathlessness for the past 2 days..."
            style={{ fontSize: '1rem', lineHeight: '1.6' }}
          />
        </div>

        <button
          className="btn btn-primary btn-rounded px-4"
          onClick={handleSymptomSearch}
          disabled={!symptoms.trim() || symptomSearching}
        >
          {symptomSearching ? (
            <><span className="spinner-border spinner-border-sm me-2"></span>Finding doctors...</>
          ) : (
            <><i className="fas fa-search me-2"></i>Find Matching Doctors</>
          )}
        </button>

        {suggestedDoctors.length > 0 && (
          <div className="mt-4">
            <h6 className="fw-bold mb-3">
              <i className="fas fa-user-md me-2 text-success"></i>
              Recommended Doctors for Your Symptoms
            </h6>
            <div className="row g-3">
              {suggestedDoctors.map(doc => (
                <div className="col-md-6 col-lg-4" key={doc.id}>
                  <div className="card h-100 border" style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                    onClick={() => {
                      setSelectedDoctor(doc);
                      setSelectedDate(null);
                      setSelectedSlot(null);
                      setAvailableSlots([]);
                      goToStep(4);
                    }}
                  >
                    <div className="card-body">
                      <h6 className="mb-1">{doc.name}</h6>
                      <span className="badge bg-primary mb-2">{doc.specialization_display}</span>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                        <div><i className="fas fa-graduation-cap me-1"></i>{doc.qualification}</div>
                        <div><i className="fas fa-clock me-1"></i>{doc.experience_years} years experience</div>
                        <div className="fw-bold text-success mt-1">
                          <i className="fas fa-rupee-sign me-1"></i>{doc.consultation_fee}
                        </div>
                      </div>
                    </div>
                    <div className="card-footer bg-transparent text-center">
                      <small className="text-primary fw-bold">
                        <i className="fas fa-calendar-check me-1"></i>Select & Book
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-4">
          <div className="d-flex align-items-center mb-3">
            <hr className="flex-grow-1" />
            <span className="px-3 text-muted" style={{ fontSize: '0.85rem' }}>or browse by department</span>
            <hr className="flex-grow-1" />
          </div>
          <button className="btn btn-outline-primary btn-rounded px-4" onClick={() => goToStep(2)}>
            <i className="fas fa-hospital me-2"></i>Browse All Departments
          </button>
        </div>
      </div>
    </div>
  );

  // ===== STEP 2: SELECT DEPARTMENT =====
  const renderStep2 = () => (
    <div>
      <button className="btn-back" onClick={() => goToStep(1)}>
        <i className="fas fa-arrow-left" /> Back to Symptoms
      </button>
      <h3 className="booking-step-title">Select Department</h3>
      <p className="booking-step-subtitle">Choose the department for your consultation</p>

      <div className="booking-search">
        <i className="fas fa-search search-icon" />
        <input
          type="text"
          placeholder="Search departments..."
          value={deptSearch}
          onChange={(e) => setDeptSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="booking-loading">
          <div className="spinner-border" role="status" />
          <p className="mt-2">Loading departments...</p>
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className="booking-empty">
          <i className="fas fa-building-columns" />
          <p>No departments found</p>
        </div>
      ) : (
        <div className="row g-3">
          {filteredDepts.map((dept) => (
            <div className="col-6 col-md-4 col-lg-3" key={dept.id}>
              <div
                className="dept-booking-card"
                onClick={() => {
                  setSelectedDept(dept);
                  goToStep(3);
                }}
              >
                <div className="dept-icon-wrap">
                  <i className={`fas ${getDeptIcon(dept.name)}`} />
                </div>
                <h5>{dept.name}</h5>
                <p>{dept.description || 'Specialized care and treatment'}</p>
                <span className="doctor-count">
                  <i className="fas fa-user-doctor me-1" />
                  {deptDoctorCounts[dept.id] || 0} Doctors
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <button className="btn-back" onClick={() => goToStep(2)}>
        <i className="fas fa-arrow-left" /> Back to Departments
      </button>
      <h3 className="booking-step-title">Select Doctor</h3>
      <p className="booking-step-subtitle">
        Showing doctors in <strong>{selectedDept?.name}</strong>
      </p>

      {loading ? (
        <div className="booking-loading">
          <div className="spinner-border" role="status" />
          <p className="mt-2">Loading doctors...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="booking-empty">
          <i className="fas fa-user-doctor" />
          <p>No doctors available in this department</p>
          <button className="btn btn-outline-primary mt-2" onClick={() => goToStep(2)}>
            Choose Another Department
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {doctors.map((doc) => {
            const rating = doctorRatings[doc.id];
            return (
              <div className="col-md-6 col-lg-4" key={doc.id}>
                <div className="doctor-booking-card">
                  <div className="doctor-avatar-wrap">
                    <i className="fas fa-user-doctor" />
                  </div>
                  <h5>{getDoctorDisplayName(doc)}</h5>
                  <div className="specialization">{doc.specialization || selectedDept?.name}</div>
                  <div className="experience">
                    {doc.experience_years ? `${doc.experience_years} years experience` : ''}
                  </div>
                  <div className="doctor-rating mb-2">
                    {rating ? (
                      <>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i
                            key={star}
                            className={`fas fa-star${star <= Math.round(rating.avg) ? '' : ' text-muted opacity-25'}`}
                          />
                        ))}
                        <span className="ms-1 text-muted" style={{ fontSize: '0.8rem' }}>
                          ({rating.avg} / {rating.count} reviews)
                        </span>
                      </>
                    ) : (
                      <span className="no-rating">No reviews yet</span>
                    )}
                  </div>
                  {doc.available_days && (
                    <div className="available-days">
                      {(Array.isArray(doc.available_days) ? doc.available_days : doc.available_days.split(',')).map(
                        (day, i) => (
                          <span className="day-badge" key={i}>
                            {day.trim()}
                          </span>
                        )
                      )}
                    </div>
                  )}
                  <div className="consultation-fee mt-2">
                    {doc.consultation_fee ? `₹${doc.consultation_fee}` : 'Fee on visit'}
                  </div>
                  <button
                    className="btn btn-view-availability"
                    onClick={() => {
                      setSelectedDoctor(doc);
                      setSelectedDate(null);
                      setSelectedSlot(null);
                      setAvailableSlots([]);
                      goToStep(4);
                    }}
                  >
                    <i className="fas fa-calendar-check me-2" />
                    View Availability
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStep4 = () => {
    const days = getNext30Days();
    return (
      <div>
        <button className="btn-back" onClick={() => goToStep(3)}>
          <i className="fas fa-arrow-left" /> Back to Doctors
        </button>
        <h3 className="booking-step-title">Select Date & Time</h3>
        <p className="booking-step-subtitle">Choose a convenient date and time slot</p>

        <div className="selected-doctor-summary">
          <div className="mini-avatar">
            <i className="fas fa-user-doctor" />
          </div>
          <div>
            <strong>{getDoctorDisplayName(selectedDoctor)}</strong>
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              {selectedDoctor?.specialization || selectedDept?.name}
              {selectedDoctor?.consultation_fee && ` | Consultation Fee: ₹${selectedDoctor.consultation_fee}`}
            </div>
          </div>
        </div>

        <div className="calendar-section mb-4">
          <h6 className="fw-bold mb-3">
            <i className="fas fa-calendar me-2 text-primary" />
            Select Date
          </h6>
          <div className="date-grid">
            {days.map((d, i) => {
              const isSunday = d.getDay() === 0;
              const isLeave = isLeaveDay(d);
              const isDisabled = isSunday || isLeave;
              const isSelected = selectedDate && formatDateISO(d) === formatDateISO(selectedDate);
              return (
                <div
                  key={i}
                  className={`date-cell${isSelected ? ' selected' : ''}${isDisabled ? (isLeave ? ' leave-day' : ' disabled') : ''}`}
                  onClick={() => {
                    if (!isDisabled) {
                      setSelectedDate(d);
                      setSelectedSlot(null);
                    }
                  }}
                  title={isLeave ? 'Doctor on leave' : isSunday ? 'Sunday - Closed' : ''}
                >
                  <span className="day-name">{DAY_NAMES_SHORT[d.getDay()]}</span>
                  <span className="day-num">{d.getDate()}</span>
                  <span className="day-month">{MONTH_NAMES_SHORT[d.getMonth()]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div className="calendar-section">
            <h6 className="fw-bold mb-3">
              <i className="fas fa-clock me-2 text-primary" />
              Available Time Slots for{' '}
              {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h6>
            {loading ? (
              <div className="booking-loading">
                <div className="spinner-border spinner-border-sm" role="status" />
                <span className="ms-2">Loading slots...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="booking-empty">
                <i className="fas fa-clock" style={{ fontSize: '2rem' }} />
                <p>No available slots for this date. Please try another date.</p>
              </div>
            ) : (
              <div className="time-slots-grid">
                {availableSlots.map((slot, i) => {
                  const time = typeof slot === 'string' ? slot : slot.time || slot.start_time;
                  const isBooked = typeof slot === 'object' && (slot.is_booked || slot.booked);
                  const isSelected = selectedSlot === time;
                  return (
                    <button
                      key={i}
                      className={`time-slot-btn${isBooked ? ' booked' : ' available'}${isSelected ? ' selected' : ''}`}
                      disabled={isBooked}
                      onClick={() => setSelectedSlot(time)}
                    >
                      {formatTime12(time)}
                      {isBooked && (
                        <span style={{ display: 'block', fontSize: '0.65rem' }}>Booked</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSlot && (
              <div className="text-center mt-4">
                <button
                  className="btn btn-confirm-booking"
                  onClick={() => goToStep(5)}
                >
                  Continue <i className="fas fa-arrow-right ms-2" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStep5 = () => (
    <div>
      <button className="btn-back" onClick={() => goToStep(4)}>
        <i className="fas fa-arrow-left" /> Back to Date & Time
      </button>
      <h3 className="booking-step-title">Patient Details</h3>
      <p className="booking-step-subtitle">Enter the patient information</p>

      {!isLoggedIn && !existingPatientId && (
        <div className="patient-lookup">
          <h6>
            <i className="fas fa-search me-2" />
            Already a patient? Search by phone number
          </h6>
          <div className="d-flex gap-2 mt-2">
            <input
              type="tel"
              className="form-control"
              placeholder="Enter 10-digit phone number"
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              maxLength={15}
            />
            <button
              className="btn btn-primary"
              onClick={handlePhoneSearch}
              disabled={searchingPhone || phoneSearch.length < 10}
              style={{ whiteSpace: 'nowrap' }}
            >
              {searchingPhone ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <i className="fas fa-search me-1" /> Search
                </>
              )}
            </button>
          </div>
          {phoneSearchResult === 'found' && (
            <div className="mt-2">
              <span className="patient-found-badge">
                <i className="fas fa-check-circle" /> Patient record found! Details filled automatically.
              </span>
            </div>
          )}
          {phoneSearchResult === 'not_found' && (
            <div className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-info-circle me-1" /> No patient found. Please fill in the details below.
            </div>
          )}
        </div>
      )}

      {existingPatientId && (
        <div className="mb-3">
          <span className="patient-found-badge">
            <i className="fas fa-check-circle" /> Using existing patient record (ID: {existingPatientId})
          </span>
        </div>
      )}

      <div className="patient-form-section">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">
              First Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={patientData.first_name}
              onChange={(e) => setPatientData({ ...patientData, first_name: e.target.value })}
              placeholder="Enter first name"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">
              Last Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={patientData.last_name}
              onChange={(e) => setPatientData({ ...patientData, last_name: e.target.value })}
              placeholder="Enter last name"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={patientData.email}
              onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">
              Phone Number <span className="text-danger">*</span>
            </label>
            <input
              type="tel"
              className="form-control"
              value={patientData.phone_number}
              onChange={(e) => setPatientData({ ...patientData, phone_number: e.target.value })}
              placeholder="10-digit phone number"
              maxLength={15}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Date of Birth</label>
            <input
              type="date"
              className="form-control"
              value={patientData.date_of_birth}
              onChange={(e) => setPatientData({ ...patientData, date_of_birth: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Gender</label>
            <select
              className="form-select"
              value={patientData.gender}
              onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Blood Group</label>
            <select
              className="form-select"
              value={patientData.blood_group}
              onChange={(e) => setPatientData({ ...patientData, blood_group: e.target.value })}
            >
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">Address</label>
            <input
              type="text"
              className="form-control"
              value={patientData.address}
              onChange={(e) => setPatientData({ ...patientData, address: e.target.value })}
              placeholder="Enter address"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Reason for Visit</label>
            <textarea
              className="form-control"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe your symptoms or reason for the visit..."
            />
          </div>
        </div>
        <div className="text-center mt-4">
          <button
            className="btn btn-confirm-booking"
            onClick={() => goToStep(6)}
            disabled={!isStep4Valid()}
          >
            Review Booking <i className="fas fa-arrow-right ms-2" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => {
    if (bookingSuccess) {
      return (
        <div className="success-screen">
          <div className="success-icon-wrap">
            <i className="fas fa-check" />
          </div>
          <h2>Appointment Booked!</h2>
          <p className="success-msg">
            Your appointment has been successfully scheduled at BG Hospitals.
          </p>
          <div className="success-details">
            <div className="summary-row">
              <span className="summary-label">Appointment ID</span>
              <span className="summary-value">#{bookingResult?.id || 'N/A'}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Patient</span>
              <span className="summary-value">{bookingResult?.patientName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Doctor</span>
              <span className="summary-value">{bookingResult?.doctorName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Department</span>
              <span className="summary-value">{bookingResult?.departmentName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Date</span>
              <span className="summary-value">
                {selectedDate?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Time</span>
              <span className="summary-value">{formatTime12(bookingResult?.time)}</span>
            </div>
            {bookingResult?.token_number && (
              <div className="summary-row">
                <span className="summary-label">Token Number</span>
                <span className="summary-value" style={{ color: '#1a4b8c', fontSize: '1.2rem' }}>
                  {bookingResult.token_number}
                </span>
              </div>
            )}
            <div className="summary-row">
              <span className="summary-label">Consultation Fee</span>
              <span className="summary-value">
                {bookingResult?.fee ? `₹${bookingResult.fee}` : 'Payable at counter'}
              </span>
            </div>
          </div>
          <div className="success-actions">
            <Link to="/" className="btn btn-outline-primary">
              <i className="fas fa-home me-2" />
              Home
            </Link>
            <Link to="/login" className="btn btn-outline-secondary">
              <i className="fas fa-user me-2" />
              Patient Portal
            </Link>
            <button className="btn btn-primary" onClick={handlePrint}>
              <i className="fas fa-print me-2" />
              Print
            </button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <button className="btn-back" onClick={() => goToStep(5)}>
          <i className="fas fa-arrow-left" /> Back to Patient Details
        </button>
        <h3 className="booking-step-title">Confirm Your Appointment</h3>
        <p className="booking-step-subtitle">Review the details below and confirm your booking</p>

        <div className="confirmation-card">
          <div className="summary-row">
            <span className="summary-label">Department</span>
            <span className="summary-value">{selectedDept?.name}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Doctor</span>
            <span className="summary-value">{getDoctorDisplayName(selectedDoctor)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Date</span>
            <span className="summary-value">
              {selectedDate?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Time</span>
            <span className="summary-value">{formatTime12(selectedSlot)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Patient Name</span>
            <span className="summary-value">{patientData.first_name} {patientData.last_name}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Phone</span>
            <span className="summary-value">{patientData.phone_number}</span>
          </div>
          {reason && (
            <div className="summary-row">
              <span className="summary-label">Reason</span>
              <span className="summary-value">{reason}</span>
            </div>
          )}

          <div className="fee-highlight">
            <div className="fee-label">Consultation Fee</div>
            <div className="fee-amount">
              {selectedDoctor?.consultation_fee ? `₹${selectedDoctor.consultation_fee}` : 'Fee on visit'}
            </div>
            <div className="fee-label">Payable at the hospital counter</div>
          </div>

          {error && (
            <div className="alert booking-alert alert-danger">
              <i className="fas fa-exclamation-circle me-2" />
              {error}
            </div>
          )}

          <div className="text-center">
            <button
              className="btn btn-confirm-booking"
              onClick={handleConfirmBooking}
              disabled={booking}
            >
              {booking ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Booking...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle me-2" />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const progressPercent = bookingSuccess ? 100 : ((currentStep - 1) / STEPS.length) * 100;

  return (
    <div className="booking-page">
      <div className="booking-header">
        <div className="container">
          <h1>
            <i className="fas fa-calendar-check me-2" />
            Book an Appointment
          </h1>
          <p>BG Hospitals - Excellence in Healthcare, Compassion in Care</p>
        </div>
      </div>

      {!bookingSuccess && renderStepIndicator()}

      <div className="booking-progress">
        <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="booking-content">
        {error && currentStep !== 6 && (
          <div className="alert booking-alert alert-danger mb-3">
            <i className="fas fa-exclamation-circle me-2" />
            {error}
          </div>
        )}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
      </div>
    </div>
  );
};

export default BookAppointment;
