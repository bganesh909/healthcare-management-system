import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  // Animated counters
  const [counters, setCounters] = useState({ beds: 0, doctors: 0, surgeries: 0, departments: 0 });
  const statsRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animateCounters();
        }
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const animateCounters = () => {
    const targets = { beds: 500, doctors: 150, surgeries: 50000, departments: 25 };
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounters({
        beds: Math.floor(targets.beds * ease),
        doctors: Math.floor(targets.doctors * ease),
        surgeries: Math.floor(targets.surgeries * ease),
        departments: Math.floor(targets.departments * ease),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
  };

  const departments = [
    { name: 'Cardiology', icon: 'fa-heart-pulse', desc: 'Heart & Cardiovascular Care' },
    { name: 'Neurology', icon: 'fa-brain', desc: 'Brain & Nervous System' },
    { name: 'Orthopedics', icon: 'fa-bone', desc: 'Bones & Joint Care' },
    { name: 'Oncology', icon: 'fa-ribbon', desc: 'Cancer Treatment & Care' },
    { name: 'Pediatrics', icon: 'fa-baby', desc: 'Child Healthcare' },
    { name: 'Gynecology', icon: 'fa-venus', desc: "Women's Health" },
    { name: 'Emergency', icon: 'fa-truck-medical', desc: '24/7 Emergency Services' },
    { name: 'General Medicine', icon: 'fa-stethoscope', desc: 'Primary Healthcare' },
    { name: 'Ophthalmology', icon: 'fa-eye', desc: 'Eye Care & Surgery' },
    { name: 'Dermatology', icon: 'fa-hand-dots', desc: 'Skin & Hair Treatment' },
    { name: 'Psychiatry', icon: 'fa-head-side-virus', desc: 'Mental Health Care' },
    { name: 'Gastroenterology', icon: 'fa-stomach', desc: 'Digestive System Care' },
  ];

  const services = [
    { name: '24/7 Emergency Care', icon: 'fa-kit-medical', desc: 'Round-the-clock emergency services with trauma care and critical response teams.' },
    { name: 'Advanced Diagnostics & Lab', icon: 'fa-microscope', desc: 'State-of-the-art pathology, microbiology, and biochemistry labs with rapid reporting.' },
    { name: 'Blood Bank', icon: 'fa-droplet', desc: 'Fully equipped blood bank with all blood groups available and component separation facility.' },
    { name: 'Pharmacy', icon: 'fa-pills', desc: '24/7 in-house pharmacy with a wide range of medicines, surgical items, and medical devices.' },
    { name: 'Operation Theaters (12 OTs)', icon: 'fa-hospital', desc: 'Modular OTs with laminar air flow, advanced monitoring, and robotic surgery capabilities.' },
    { name: 'ICU & Critical Care', icon: 'fa-bed-pulse', desc: 'Multi-disciplinary ICUs including MICU, SICU, NICU, and PICU with ventilator support.' },
    { name: 'Ambulance Services', icon: 'fa-truck-medical', desc: 'Fleet of advanced and basic life support ambulances with GPS tracking and trained paramedics.' },
    { name: 'Telemedicine', icon: 'fa-video', desc: 'Virtual consultations with specialists from the comfort of your home via secure video platform.' },
  ];

  const whyChooseUs = [
    { title: 'NABH & JCI Accredited', icon: 'fa-award', desc: 'Internationally recognized quality standards ensuring world-class patient care and safety.' },
    { title: 'State-of-the-art Equipment', icon: 'fa-microchip', desc: 'Latest medical technology including 3T MRI, 256-slice CT, PET-CT, and robotic surgery systems.' },
    { title: 'Expert Medical Team', icon: 'fa-user-doctor', desc: '150+ experienced doctors, many trained at premier international institutions worldwide.' },
    { title: 'Affordable Healthcare', icon: 'fa-indian-rupee-sign', desc: 'Transparent pricing with no hidden charges. Special packages and EMI options available.' },
    { title: 'Insurance & Cashless', icon: 'fa-shield-halved', desc: 'Empaneled with 50+ insurance companies. Hassle-free cashless treatment facility.' },
    { title: 'Patient-First Approach', icon: 'fa-hands-holding-child', desc: 'Personalized care plans, dedicated patient coordinators, and multilingual support staff.' },
  ];

  const featuredDoctors = [
    { name: 'Dr. Rajesh Kumar', specialization: 'Cardiology', experience: '25+ Years', qualification: 'MD, DM (Cardiology), FACC', desc: 'Chief Cardiologist & Director of Cardiac Sciences' },
    { name: 'Dr. Priya Sharma', specialization: 'Neurology', experience: '20+ Years', qualification: 'MD, DM (Neurology), FRCP', desc: 'Head of Neurosciences Department' },
    { name: 'Dr. Arun Patel', specialization: 'Orthopedics', experience: '18+ Years', qualification: 'MS (Ortho), MCh, FRCS', desc: 'Senior Joint Replacement Surgeon' },
    { name: 'Dr. Meena Reddy', specialization: 'Oncology', experience: '22+ Years', qualification: 'MD, DM (Oncology), DNB', desc: 'Director of Cancer Institute' },
  ];

  const testimonials = [
    { name: 'Suresh Menon', rating: 5, text: 'The cardiac team at BG Hospitals saved my life. From the emergency admission to the bypass surgery and recovery, every step was handled with utmost professionalism and genuine care. I am forever grateful to Dr. Rajesh Kumar and his team.', treatment: 'Cardiac Bypass Surgery' },
    { name: 'Lakshmi Devi', rating: 5, text: 'I had my knee replacement surgery here and the experience was exceptional. The orthopedic team explained everything clearly, the surgery went smoothly, and the physiotherapy team ensured a quick recovery. I am walking pain-free now!', treatment: 'Knee Replacement' },
    { name: 'Mohammed Irfan', rating: 5, text: 'My mother was treated for a neurological condition and we were amazed by the compassion shown by the entire staff. The nurses were incredibly caring, the food was good, and the rooms were spotless. Truly a world-class hospital in Bengaluru.', treatment: 'Neurological Treatment' },
  ];

  const healthPackages = [
    { name: 'Master Health Checkup', price: '2,999', icon: 'fa-clipboard-check', tests: ['Complete Blood Count', 'Liver & Kidney Function', 'Lipid Profile', 'Thyroid Profile', 'Chest X-Ray', 'ECG', 'Urine Analysis', 'Doctor Consultation'] },
    { name: 'Cardiac Screening', price: '4,999', icon: 'fa-heart-circle-check', tests: ['2D Echo', 'TMT / Stress Test', 'Lipid Profile', 'Blood Sugar', 'ECG', 'Chest X-Ray', 'Cardiologist Consultation', 'Diet Counseling'] },
    { name: "Women's Wellness", price: '3,499', icon: 'fa-person-dress', tests: ['CBC & ESR', 'Thyroid Profile', 'Pap Smear', 'Mammography', 'Bone Density', 'Vitamin D & B12', 'Gynecologist Consultation', 'Nutrition Advice'] },
    { name: 'Senior Citizen Package', price: '5,999', icon: 'fa-person-cane', tests: ['Complete Blood Panel', 'Cardiac Assessment', 'Bone Density Scan', 'Eye Checkup', 'Hearing Test', 'Pulmonary Function', 'Specialist Consultations', 'Comprehensive Report'] },
  ];

  return (
    <div className="landing-page">
      {/* ==================== HERO SECTION ==================== */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-particles">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
        </div>
        <div className="container position-relative" style={{ zIndex: 2 }}>
          <div className="row align-items-center min-vh-80">
            <div className="col-lg-8 mx-auto text-center">
              <div className="hero-badge mb-3">
                <span><i className="fas fa-shield-halved me-2"></i>NABH Accredited & JCI Certified</span>
              </div>
              <h1 className="hero-title">
                <span className="hero-title-prefix">Welcome to</span>
                <span className="hero-title-main">BG Hospitals</span>
              </h1>
              <p className="hero-tagline">Excellence in Healthcare, Compassion in Care</p>
              <p className="hero-sub-tagline">
                Multi-Specialty <span className="tagline-divider">|</span> 24/7 Emergency <span className="tagline-divider">|</span> Advanced Diagnostics <span className="tagline-divider">|</span> Patient-Centered Care
              </p>
              <div className="hero-cta mt-4">
                <Link to="/book-appointment" className="btn btn-hero-primary btn-lg me-3 mb-2">
                  <i className="fas fa-calendar-check me-2"></i>Book Appointment
                </Link>
                <Link to="/patient-portal" className="btn btn-hero-secondary btn-lg me-3 mb-2">
                  <i className="fas fa-file-medical me-2"></i>My Records
                </Link>
                <a href="tel:108" className="btn btn-hero-emergency btn-lg mb-2">
                  <i className="fas fa-phone-volume me-2"></i>Emergency: 108
                </a>
              </div>
              <div className="hero-contact-bar mt-4">
                <span><i className="fas fa-phone me-1"></i> +91-80-4567-8900</span>
                <span className="mx-3">|</span>
                <span><i className="fas fa-clock me-1"></i> 24/7 Emergency Services</span>
                <span className="mx-3">|</span>
                <span><i className="fas fa-location-dot me-1"></i> Bengaluru, Karnataka</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Stats */}
        <div className="hero-stats-container" ref={statsRef}>
          <div className="container">
            <div className="row g-3 justify-content-center">
              <div className="col-6 col-md-3">
                <div className="hero-stat-card">
                  <div className="stat-icon-wrap"><i className="fas fa-bed"></i></div>
                  <div className="stat-number">{counters.beds}+</div>
                  <div className="stat-label">Hospital Beds</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="hero-stat-card">
                  <div className="stat-icon-wrap"><i className="fas fa-user-doctor"></i></div>
                  <div className="stat-number">{counters.doctors}+</div>
                  <div className="stat-label">Expert Doctors</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="hero-stat-card">
                  <div className="stat-icon-wrap"><i className="fas fa-staff-snake"></i></div>
                  <div className="stat-number">{counters.surgeries.toLocaleString()}+</div>
                  <div className="stat-label">Successful Surgeries</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="hero-stat-card">
                  <div className="stat-icon-wrap"><i className="fas fa-building-columns"></i></div>
                  <div className="stat-number">{counters.departments}+</div>
                  <div className="stat-label">Departments</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== ABOUT SECTION ==================== */}
      <section className="about-section section-padding" id="about">
        <div className="container">
          <div className="section-header text-center mb-5">
            <span className="section-badge"><i className="fas fa-hospital me-2"></i>About Us</span>
            <h2 className="section-title">About BG Hospitals</h2>
            <p className="section-subtitle">A Legacy of Healing Since 2005</p>
          </div>
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <div className="about-image-placeholder">
                <div className="about-icon-display">
                  <i className="fas fa-hospital-alt"></i>
                </div>
                <div className="about-badge-overlay">
                  <div className="badge-year">
                    <span className="year-number">20+</span>
                    <span className="year-text">Years of Excellence</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="about-content">
                <h3 className="about-heading">Trusted Healthcare Partner of Bengaluru</h3>
                <p className="about-text">
                  Established in 2005, <strong>BG Hospitals</strong> has grown to become one of South India's most trusted
                  multi-specialty healthcare institutions. With <strong>NABH accreditation</strong> and <strong>JCI certification</strong>,
                  we uphold the highest international standards of patient care, safety, and clinical excellence.
                </p>
                <p className="about-text">
                  Our 500+ bed facility houses 25+ specialized departments, 12 state-of-the-art operation theaters,
                  and the latest diagnostic technology. We are committed to making world-class healthcare accessible
                  and affordable to all.
                </p>
                <div className="row mt-4">
                  <div className="col-sm-6 mb-3">
                    <div className="about-mission-card">
                      <h5><i className="fas fa-bullseye me-2 text-primary"></i>Our Mission</h5>
                      <p>To provide compassionate, high-quality, and affordable healthcare services that improve the lives of our patients and communities.</p>
                    </div>
                  </div>
                  <div className="col-sm-6 mb-3">
                    <div className="about-mission-card">
                      <h5><i className="fas fa-eye me-2 text-primary"></i>Our Vision</h5>
                      <p>To be the most trusted and preferred healthcare destination in South India, known for clinical excellence and patient-centered care.</p>
                    </div>
                  </div>
                </div>
                <div className="about-achievements mt-3">
                  <div className="achievement-item"><i className="fas fa-check-circle"></i> NABH Accredited since 2010</div>
                  <div className="achievement-item"><i className="fas fa-check-circle"></i> JCI Certified since 2015</div>
                  <div className="achievement-item"><i className="fas fa-check-circle"></i> Best Hospital Award - Karnataka 2023</div>
                  <div className="achievement-item"><i className="fas fa-check-circle"></i> Green Hospital Certification</div>
                  <div className="achievement-item"><i className="fas fa-check-circle"></i> Academic & Research Center</div>
                  <div className="achievement-item"><i className="fas fa-check-circle"></i> ISO 9001:2015 Certified</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== DEPARTMENTS SECTION ==================== */}
      <section className="departments-section section-padding" id="departments">
        <div className="container">
          <div className="section-header text-center mb-5">
            <span className="section-badge"><i className="fas fa-sitemap me-2"></i>Specialties</span>
            <h2 className="section-title">Our Departments</h2>
            <p className="section-subtitle">Comprehensive care across 25+ medical and surgical specialties</p>
          </div>
          <div className="row g-4">
            {departments.map((dept, index) => (
              <div className="col-6 col-md-4 col-lg-3" key={index}>
                <Link to="/departments" className="text-decoration-none">
                  <div className="dept-card">
                    <div className="dept-icon">
                      <i className={`fas ${dept.icon}`}></i>
                    </div>
                    <h5 className="dept-name">{dept.name}</h5>
                    <p className="dept-desc">{dept.desc}</p>
                    <span className="dept-arrow"><i className="fas fa-arrow-right"></i></span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link to="/departments" className="btn btn-outline-primary btn-lg px-5">
              <i className="fas fa-th-large me-2"></i>View All Departments
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== SERVICES SECTION ==================== */}
      <section className="services-section section-padding" id="services">
        <div className="container">
          <div className="section-header text-center mb-5">
            <span className="section-badge"><i className="fas fa-hand-holding-medical me-2"></i>Our Services</span>
            <h2 className="section-title">Hospital Services</h2>
            <p className="section-subtitle">Comprehensive healthcare services under one roof</p>
          </div>
          <div className="row g-4">
            {services.map((service, index) => (
              <div className="col-md-6 col-lg-3" key={index}>
                <div className="service-card">
                  <div className="service-icon">
                    <i className={`fas ${service.icon}`}></i>
                  </div>
                  <h5 className="service-name">{service.name}</h5>
                  <p className="service-desc">{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== WHY CHOOSE US SECTION ==================== */}
      <section className="why-choose-section section-padding" id="why-us">
        <div className="container">
          <div className="section-header text-center mb-5">
            <span className="section-badge"><i className="fas fa-star me-2"></i>Why BG Hospitals</span>
            <h2 className="section-title">Why Choose Us</h2>
            <p className="section-subtitle">What sets BG Hospitals apart from the rest</p>
          </div>
          <div className="row g-4">
            {whyChooseUs.map((item, index) => (
              <div className="col-md-6 col-lg-4" key={index}>
                <div className="why-card">
                  <div className="why-icon">
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <div className="why-content">
                    <h5 className="why-title">{item.title}</h5>
                    <p className="why-desc">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== DOCTORS SPOTLIGHT ==================== */}
      <section className="doctors-section section-padding" id="doctors">
        <div className="container">
          <div className="section-header text-center mb-5">
            <span className="section-badge"><i className="fas fa-user-doctor me-2"></i>Our Experts</span>
            <h2 className="section-title">Meet Our Doctors</h2>
            <p className="section-subtitle">Experienced specialists dedicated to your health and well-being</p>
          </div>
          <div className="row g-4">
            {featuredDoctors.map((doctor, index) => (
              <div className="col-md-6 col-lg-3" key={index}>
                <div className="doctor-spotlight-card">
                  <div className="doctor-avatar">
                    <i className="fas fa-user-doctor"></i>
                  </div>
                  <div className="doctor-info">
                    <h5 className="doctor-name">{doctor.name}</h5>
                    <span className="doctor-spec">{doctor.specialization}</span>
                    <p className="doctor-qual">{doctor.qualification}</p>
                    <p className="doctor-desc">{doctor.desc}</p>
                    <div className="doctor-exp">
                      <i className="fas fa-clock me-1"></i>{doctor.experience} Experience
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link to="/doctors" className="btn btn-outline-primary btn-lg px-5">
              <i className="fas fa-users me-2"></i>View All Doctors
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS SECTION ==================== */}
      <section className="testimonials-section section-padding" id="testimonials">
        <div className="container">
          <div className="section-header text-center mb-5">
            <span className="section-badge"><i className="fas fa-quote-left me-2"></i>Testimonials</span>
            <h2 className="section-title">What Our Patients Say</h2>
            <p className="section-subtitle">Real stories from real patients who trusted us with their care</p>
          </div>
          <div className="row g-4">
            {testimonials.map((testimonial, index) => (
              <div className="col-md-4" key={index}>
                <div className="testimonial-card">
                  <div className="testimonial-quote"><i className="fas fa-quote-left"></i></div>
                  <p className="testimonial-text">{testimonial.text}</p>
                  <div className="testimonial-rating">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <i className="fas fa-star" key={i}></i>
                    ))}
                  </div>
                  <div className="testimonial-author">
                    <div className="author-avatar">
                      <i className="fas fa-user"></i>
                    </div>
                    <div>
                      <h6 className="author-name">{testimonial.name}</h6>
                      <span className="author-treatment">{testimonial.treatment}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HEALTH PACKAGES SECTION ==================== */}
      <section className="packages-section section-padding" id="packages">
        <div className="container">
          <div className="section-header text-center mb-5">
            <span className="section-badge"><i className="fas fa-box-open me-2"></i>Health Packages</span>
            <h2 className="section-title">Health Checkup Packages</h2>
            <p className="section-subtitle">Preventive health packages designed for every age group and need</p>
          </div>
          <div className="row g-4">
            {healthPackages.map((pkg, index) => (
              <div className="col-md-6 col-lg-3" key={index}>
                <div className="package-card">
                  <div className="package-icon">
                    <i className={`fas ${pkg.icon}`}></i>
                  </div>
                  <h5 className="package-name">{pkg.name}</h5>
                  <div className="package-price">
                    <span className="price-currency">&#8377;</span>
                    <span className="price-amount">{pkg.price}</span>
                  </div>
                  <ul className="package-tests">
                    {pkg.tests.map((test, i) => (
                      <li key={i}><i className="fas fa-check me-2"></i>{test}</li>
                    ))}
                  </ul>
                  <Link to="/book-appointment" className="btn btn-package w-100">
                    Book Now <i className="fas fa-arrow-right ms-2"></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CONTACT SECTION ==================== */}
      <section className="contact-section section-padding" id="contact">
        <div className="container">
          <div className="section-header text-center mb-5">
            <span className="section-badge"><i className="fas fa-envelope me-2"></i>Get in Touch</span>
            <h2 className="section-title">Contact Us</h2>
            <p className="section-subtitle">We are here for you 24/7. Reach out to us anytime.</p>
          </div>
          <div className="row g-4">
            <div className="col-lg-4">
              <div className="contact-info-card">
                <div className="contact-item">
                  <div className="contact-icon"><i className="fas fa-location-dot"></i></div>
                  <div>
                    <h6>Address</h6>
                    <p>123, Medical Hub Road,<br />Bengaluru, Karnataka - 560001</p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon"><i className="fas fa-phone"></i></div>
                  <div>
                    <h6>Phone</h6>
                    <p>+91-80-4567-8900</p>
                  </div>
                </div>
                <div className="contact-item emergency-contact">
                  <div className="contact-icon"><i className="fas fa-phone-volume"></i></div>
                  <div>
                    <h6>Emergency</h6>
                    <p className="text-danger fw-bold">108</p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon"><i className="fas fa-envelope"></i></div>
                  <div>
                    <h6>Email</h6>
                    <p>info@bghospitals.com</p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon"><i className="fas fa-clock"></i></div>
                  <div>
                    <h6>Working Hours</h6>
                    <p>24/7 Emergency<br />OPD: 8:00 AM - 8:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-8">
              <div className="map-placeholder">
                <div className="map-content">
                  <i className="fas fa-map-marked-alt"></i>
                  <h5>BG Hospitals</h5>
                  <p>123, Medical Hub Road, Bengaluru, Karnataka - 560001</p>
                  <div className="map-grid">
                    <div className="map-grid-line"></div>
                    <div className="map-grid-line"></div>
                    <div className="map-grid-line"></div>
                    <div className="map-grid-line"></div>
                  </div>
                  <div className="map-pin">
                    <i className="fas fa-location-dot"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="container">
            <div className="row g-4">
              <div className="col-lg-4">
                <div className="footer-brand">
                  <h3><i className="fas fa-plus-circle me-2"></i>BG Hospitals</h3>
                  <p className="footer-brand-tagline">Excellence in Healthcare, Compassion in Care</p>
                  <p className="footer-brand-desc">
                    A leading multi-specialty hospital in Bengaluru, providing world-class healthcare services
                    since 2005. NABH Accredited and JCI Certified for quality and patient safety.
                  </p>
                  <div className="footer-social">
                    <a href="#facebook" className="social-link" onClick={e => e.preventDefault()}><i className="fab fa-facebook-f"></i></a>
                    <a href="#twitter" className="social-link" onClick={e => e.preventDefault()}><i className="fab fa-twitter"></i></a>
                    <a href="#instagram" className="social-link" onClick={e => e.preventDefault()}><i className="fab fa-instagram"></i></a>
                    <a href="#linkedin" className="social-link" onClick={e => e.preventDefault()}><i className="fab fa-linkedin-in"></i></a>
                    <a href="#youtube" className="social-link" onClick={e => e.preventDefault()}><i className="fab fa-youtube"></i></a>
                  </div>
                </div>
              </div>
              <div className="col-lg-2 col-md-4">
                <h5 className="footer-heading">Quick Links</h5>
                <ul className="footer-links">
                  <li><Link to="/"><i className="fas fa-chevron-right me-2"></i>Home</Link></li>
                  <li><Link to="/doctors"><i className="fas fa-chevron-right me-2"></i>Find a Doctor</Link></li>
                  <li><Link to="/book-appointment"><i className="fas fa-chevron-right me-2"></i>Book Appointment</Link></li>
                  <li><Link to="/departments"><i className="fas fa-chevron-right me-2"></i>Departments</Link></li>
                  <li><Link to="/login"><i className="fas fa-chevron-right me-2"></i>Patient Portal</Link></li>
                </ul>
              </div>
              <div className="col-lg-3 col-md-4">
                <h5 className="footer-heading">Departments</h5>
                <ul className="footer-links">
                  <li><Link to="/departments"><i className="fas fa-chevron-right me-2"></i>Cardiology</Link></li>
                  <li><Link to="/departments"><i className="fas fa-chevron-right me-2"></i>Neurology</Link></li>
                  <li><Link to="/departments"><i className="fas fa-chevron-right me-2"></i>Orthopedics</Link></li>
                  <li><Link to="/departments"><i className="fas fa-chevron-right me-2"></i>Oncology</Link></li>
                  <li><Link to="/departments"><i className="fas fa-chevron-right me-2"></i>Pediatrics</Link></li>
                  <li><Link to="/departments"><i className="fas fa-chevron-right me-2"></i>Emergency Medicine</Link></li>
                </ul>
              </div>
              <div className="col-lg-3 col-md-4">
                <h5 className="footer-heading">Contact Info</h5>
                <div className="footer-contact">
                  <p><i className="fas fa-map-marker-alt me-2"></i>123, Medical Hub Road,<br /><span className="ms-4">Bengaluru, Karnataka - 560001</span></p>
                  <p><i className="fas fa-phone me-2"></i>+91-80-4567-8900</p>
                  <p><i className="fas fa-ambulance me-2 text-danger"></i><strong className="text-danger">Emergency: 108</strong></p>
                  <p><i className="fas fa-envelope me-2"></i>info@bghospitals.com</p>
                  <p><i className="fas fa-clock me-2"></i>OPD: 8 AM - 8 PM | ER: 24/7</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-6 text-center text-md-start">
                <p className="mb-0">&copy; {new Date().getFullYear()} BG Hospitals. All Rights Reserved.</p>
              </div>
              <div className="col-md-6 text-center text-md-end">
                <p className="mb-0">
                  <i className="fas fa-heart text-danger me-1"></i> Committed to Your Health & Well-being
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
