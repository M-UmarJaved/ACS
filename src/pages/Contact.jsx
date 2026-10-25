import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';

const WHATSAPP_NUMBER = '923001202275';

const Contact = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const { schoolData } = useSchoolData();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const lines = [
            `*Admission / Campus Inquiry — ${schoolData.name || 'ACS School & College'}*`,
            `*Name:* ${formData.name}`,
            formData.phone ? `*Phone:* ${formData.phone}` : null,
            formData.email ? `*Email:* ${formData.email}` : null,
            `*Subject:* ${formData.subject}`,
            `*Message:* ${formData.message}`
        ]
            .filter(Boolean)
            .join('\n');

        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        }, 4000);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div style={{ background: '#f8fafc', color: '#0f172a', minHeight: '75vh' }}>
            {/* Header */}
            <section
                style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '3.5rem 0 3rem',
                    borderBottom: '1px solid #1e293b'
                }}
            >
                <div className="container">
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                        Admissions &amp; Administration
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        Contact the Campus Office
                    </h1>
                    <p style={{ fontSize: '0.98rem', color: '#94a3b8', maxWidth: '600px', lineHeight: 1.6, margin: 0 }}>
                        Reach out for admission inquiries, fee structure details, or academic counseling at our Painsra campus.
                    </p>
                </div>
            </section>

            {/* Contact Content */}
            <section style={{ padding: '3.5rem 0' }}>
                <div className="container">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '2rem',
                            alignItems: 'start'
                        }}
                    >
                        {/* Form */}
                        <div className="card" style={{ background: '#ffffff' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                                Submit an Admission or General Inquiry
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                                Complete the form below to connect directly with the Admissions Desk.
                            </p>

                            {submitted ? (
                                <div
                                    style={{
                                        background: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        borderRadius: '8px',
                                        padding: '2rem',
                                        textAlign: 'center',
                                        color: '#065f46'
                                    }}
                                >
                                    <CheckCircle2 size={28} style={{ margin: '0 auto 0.75rem' }} />
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                                        Inquiry Prepared
                                    </h3>
                                    <p style={{ fontSize: '0.86rem', margin: 0 }}>
                                        Your inquiry details have been formatted in WhatsApp for immediate response by our office.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Full Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="dw-input"
                                            style={{ width: '100%' }}
                                            required
                                            placeholder="e.g. Muhammad Tariq"
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Phone Number *</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="dw-input"
                                                style={{ width: '100%' }}
                                                required
                                                placeholder="0300-XXXXXXX"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email (Optional)</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="dw-input"
                                                style={{ width: '100%' }}
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Class / Inquiry Subject *</label>
                                        <input
                                            type="text"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="dw-input"
                                            style={{ width: '100%' }}
                                            required
                                            placeholder="e.g. 9th Science or 1st Year F.Sc Admission"
                                        />
                                    </div>

                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Message *</label>
                                        <textarea
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="dw-input"
                                            style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                                            required
                                            placeholder="Write your question regarding admissions, fee structure, or transport..."
                                        />
                                    </div>

                                    <button type="submit" className="dw-btn dw-btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                                        <span>Submit Inquiry</span>
                                        <ArrowRight size={15} />
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Directory Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                {
                                    icon: MapPin,
                                    title: 'Campus Address',
                                    value: schoolData?.contact?.address || 'ACS Higher Secondary School, Main Jhang Road, Painsra, Faisalabad'
                                },
                                {
                                    icon: Phone,
                                    title: 'Admissions & Inquiry Desk',
                                    value: schoolData?.contact?.phone || '0300-1202275'
                                },
                                {
                                    icon: Mail,
                                    title: 'Official Email',
                                    value: schoolData?.contact?.email || 'Infoacspainsra@gmail.com'
                                },
                                {
                                    icon: Clock,
                                    title: 'Visiting Hours',
                                    value: schoolData?.contact?.hours || 'Monday – Saturday: 7:30 AM – 2:30 PM'
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="card" style={{ background: '#ffffff', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div
                                        style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '8px',
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#0f172a',
                                            flexShrink: 0
                                        }}
                                    >
                                        <item.icon size={18} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                                            {item.title}
                                        </h3>
                                        <p style={{ fontSize: '0.88rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                                            {item.value}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;
