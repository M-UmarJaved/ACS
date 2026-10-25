export const CLASSES = [];

export const schoolData = {
    name: "ACS School & College",
    tagline: "Inspiring Excellence, Empowering Leaders.",
    description: "A premier educational institution dedicated to academic achievement and holistic development.",

    contact: {
        phone: "0300 1333275",
        email: "Infoacspainsra@gmail.com",
        address: "ACS Higher Secondary School, Jhang Road Painsra, Pakistan",
        website: "www.acscollege.com",
        hours: "Monday - Saturday: 7:30 AM - 2:30 PM"
    },

    about: {
        mission: "At ACS School & College, our mission is to shape confident, principled, and forward-thinking individuals who excel not only in academics but in life. We are dedicated to providing a comprehensive, well-structured education rooted in academic rigor, moral integrity, and critical inquiry. Within a safe, disciplined, and nurturing environment, we empower students to think independently, act responsibly, and lead with compassion. By embracing modern teaching practices, leveraging technology as a learning tool, and promoting active, experiential engagement, we prepare our students to succeed beyond the classroom—as lifelong learners, ethical citizens, and change-makers ready to meet the challenges of an ever-evolving world.",
        vision: "Our vision is to establish ACS School & College as a transformative force in education—renowned for uncompromising academic excellence, pioneering innovation, and the holistic empowerment of every student. We aspire to cultivate a generation of ethical, dynamic leaders who are not only knowledgeable and skilled but deeply principled and adaptable to the demands of a rapidly changing world. By embracing the power of modern technology, including AI-enhanced learning, while steadfastly upholding values of respect, discipline, integrity, and lifelong growth, we are shaping a future where education transcends boundaries and where every student becomes a catalyst for positive change..",
        values: [
            "Excellence in Education",
            "Integrity and Respect",
            "Innovation and Creativity",
            "Community and Collaboration",
            "Global Citizenship"
        ],
        history: "Founded on excellence, ACS Higher Secondary School has grown to become a premier educational institution, providing quality education and fostering academic excellence.",
        accreditations: [
            "HIGHER EDUCATION COMMISSION (HEC)",
            "BOARD OF INTERMEDIATE AND SECONDARY EDUCATION (BISE), FAISALABAD",
            "FAISALABAD PRIVATE SCHOOL FORUM"
        ]
    },

    statistics: [
        { value: "1000+", label: "Students" },
        { value: "200+", label: "Alumni" },
        { value: "40+", label: "Expert Staff" },
        { value: "100%", label: "University Acceptance" }
    ],

    faculty: [
        {
            id: 1,
            name: "Dr. Robert Mitchell",
            role: "Head of School",
            department: "Administration",
            image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop",
            bio: "20+ years of educational leadership experience"
        },
        {
            id: 2,
            name: "Sarah Jenkins",
            role: "Dean of Academics",
            department: "Academic Leadership",
            image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
            bio: "Former IB coordinator with expertise in curriculum development"
        },
        {
            id: 3,
            name: "Ahmed Al-Mansouri",
            role: "Head of Science Department",
            department: "Science",
            image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
            bio: "PhD in Chemistry, published researcher"
        },
        {
            id: 4,
            name: "Emily Chen",
            role: "Head of Mathematics",
            department: "Mathematics",
            image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
            bio: "International Math Olympiad coach"
        },
        {
            id: 5,
            name: "James O'Connor",
            role: "Director of Sports",
            department: "Athletics",
            image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
            bio: "Former professional athlete and certified sports coach"
        },
        {
            id: 6,
            name: "Fatima Hassan",
            role: "Head of Arts Department",
            department: "Fine Arts",
            image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
            bio: "Award-winning artist and art educator"
        }
    ],

    facilities: [
        {
            id: 1,
            name: "Modern Library",
            description: "State-of-the-art library with over 20,000 books and digital resources",
            image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&h=600&fit=crop",
            category: "Academic"
        },
        {
            id: 2,
            name: "Science Laboratories",
            description: "Fully equipped physics, chemistry, and biology labs with cutting-edge technology",
            image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop",
            category: "Academic"
        },
        {
            id: 3,
            name: "Sports Complex",
            description: "Olympic-size swimming pool, indoor courts, and athletics track",
            image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop",
            category: "Sports"
        },
        {
            id: 4,
            name: "Performing Arts Theater",
            description: "Professional 500-seat theater with advanced sound and lighting systems",
            image: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop",
            category: "Arts"
        },
        {
            id: 5,
            name: "Computer Labs",
            description: "High-tech computer labs with the latest software and programming tools",
            image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop",
            category: "Technology"
        },
        {
            id: 6,
            name: "Cafeteria",
            description: "Spacious dining hall serving nutritious, international cuisine",
            image: "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=800&h=600&fit=crop",
            category: "Facilities"
        }
    ],

    testimonials: [
        {
            id: 1,
            name: "Muhammad Amir",
            role: "Alumni",
            text: "ACS has transformed my education. The teachers are dedicated and the facilities are world-class.",
            rating: 5
        },
        {
            id: 2,
            name: "Muhammad Ali",
            role: "Alumni, Class of 2023",
            text: "The IB program here prepared me perfectly for university. I'm now studying at Cambridge thanks to ACS.",
            rating: 5
        },
        {
            id: 3,
            name: "Hafiz Muhammad Usman",
            role: "Current Student",
            text: "I love the diversity here. I've made friends from all over the world and learned so much about different cultures.",
            rating: 5
        }
    ],

    // Demo student data for portal
    students: [
        {
            id: "STU001",
            password: "demo123",
            name: "Muhammad Amir",
            grade: "2nd year ICS",
            feeStatus: "paid",
            results: [
                { subject: "Mathematics", grade: "A", percentage: 92 },
                { subject: "Physics", grade: "A-", percentage: 88 },
                { subject: "English", grade: "B+", percentage: 85 },
                { subject: "Urdu", grade: "A", percentage: 90 },
                { subject: "Chemistry", grade: "A-", percentage: 87 }
            ],
            attendance: {
                present: 172,
                absent: 3,
                total: 175,
                percentage: 98.3
            },
            previousResults: [
                {
                    term: "Term 1 — 2025",
                    results: [
                        { subject: "Mathematics", grade: "A-", percentage: 88 },
                        { subject: "Physics", grade: "B+", percentage: 84 },
                        { subject: "English", grade: "B+", percentage: 82 },
                        { subject: "Urdu", grade: "A-", percentage: 87 },
                        { subject: "Chemistry", grade: "B+", percentage: 83 }
                    ]
                },
                {
                    term: "Term 2 — 2025",
                    results: [
                        { subject: "Mathematics", grade: "A", percentage: 90 },
                        { subject: "Physics", grade: "A-", percentage: 86 },
                        { subject: "English", grade: "B+", percentage: 84 },
                        { subject: "Urdu", grade: "A", percentage: 89 },
                        { subject: "Chemistry", grade: "A-", percentage: 85 }
                    ]
                }
            ]
        },
        {
            id: "STU002",
            password: "demo123",
            name: "Muhammad Ali",
            grade: "10th boys computer",
            feeStatus: "unpaid",
            results: [
                { subject: "Mathematics", grade: "B+", percentage: 85 },
                { subject: "Physics", grade: "B", percentage: 78 },
                { subject: "English", grade: "A-", percentage: 89 },
                { subject: "Urdu", grade: "A", percentage: 91 },
                { subject: "Chemistry", grade: "B+", percentage: 84 }
            ],
            attendance: {
                present: 160,
                absent: 15,
                total: 175,
                percentage: 91.4
            },
            previousResults: [
                {
                    term: "Term 1 — 2025",
                    results: [
                        { subject: "Mathematics", grade: "B", percentage: 78 },
                        { subject: "Physics", grade: "B-", percentage: 72 },
                        { subject: "English", grade: "B+", percentage: 84 },
                        { subject: "Urdu", grade: "A-", percentage: 87 },
                        { subject: "Chemistry", grade: "B", percentage: 77 }
                    ]
                },
                {
                    term: "Term 2 — 2025",
                    results: [
                        { subject: "Mathematics", grade: "B+", percentage: 82 },
                        { subject: "Physics", grade: "B", percentage: 75 },
                        { subject: "English", grade: "A-", percentage: 86 },
                        { subject: "Urdu", grade: "A-", percentage: 89 },
                        { subject: "Chemistry", grade: "B+", percentage: 80 }
                    ]
                }
            ]
        },
        {
            id: "STU003",
            password: "demo123",
            name: "Hafiz Muhammad Usman",
            grade: "2nd year ICS",
            feeStatus: "paid",
            results: [
                { subject: "Mathematics", grade: "A", percentage: 95 },
                { subject: "Physics", grade: "A", percentage: 93 },
                { subject: "English", grade: "A-", percentage: 88 },
                { subject: "Urdu", grade: "B+", percentage: 86 },
                { subject: "Chemistry", grade: "A", percentage: 94 }
            ],
            attendance: {
                present: 170,
                absent: 5,
                total: 175,
                percentage: 97.1
            },
            previousResults: [
                {
                    term: "Term 1 — 2025",
                    results: [
                        { subject: "Mathematics", grade: "A-", percentage: 90 },
                        { subject: "Physics", grade: "A-", percentage: 89 },
                        { subject: "English", grade: "B+", percentage: 84 },
                        { subject: "Urdu", grade: "B", percentage: 80 },
                        { subject: "Chemistry", grade: "A-", percentage: 88 }
                    ]
                },
                {
                    term: "Term 2 — 2025",
                    results: [
                        { subject: "Mathematics", grade: "A", percentage: 93 },
                        { subject: "Physics", grade: "A", percentage: 91 },
                        { subject: "English", grade: "A-", percentage: 86 },
                        { subject: "Urdu", grade: "B+", percentage: 83 },
                        { subject: "Chemistry", grade: "A", percentage: 92 }
                    ]
                }
            ]
        },
        {
            id: "STU004",
            password: "demo123",
            name: "Ahmed Hassan",
            grade: "9th boys bio",
            feeStatus: "unpaid",
            results: [
                { subject: "Mathematics", grade: "B", percentage: 76 },
                { subject: "Physics", grade: "B-", percentage: 72 },
                { subject: "English", grade: "B+", percentage: 83 },
                { subject: "Urdu", grade: "A-", percentage: 88 },
                { subject: "Chemistry", grade: "B", percentage: 75 }
            ],
            attendance: {
                present: 155,
                absent: 20,
                total: 175,
                percentage: 88.6
            },
            previousResults: [
                {
                    term: "Term 1 — 2025",
                    results: [
                        { subject: "Mathematics", grade: "C+", percentage: 68 },
                        { subject: "Physics", grade: "C+", percentage: 65 },
                        { subject: "English", grade: "B", percentage: 76 },
                        { subject: "Urdu", grade: "B+", percentage: 82 },
                        { subject: "Chemistry", grade: "C+", percentage: 67 }
                    ]
                },
                {
                    term: "Term 2 — 2025",
                    results: [
                        { subject: "Mathematics", grade: "B-", percentage: 72 },
                        { subject: "Physics", grade: "B-", percentage: 70 },
                        { subject: "English", grade: "B+", percentage: 80 },
                        { subject: "Urdu", grade: "A-", percentage: 85 },
                        { subject: "Chemistry", grade: "B-", percentage: 71 }
                    ]
                }
            ]
        }
    ]
};

// Admin credentials (manages students, marks, attendance)
export const adminCredentials = {
    username: "admin",
    password: "admin123"
};

// Developer credentials (manages school info, faculty, facilities)
export const developerCredentials = {
    username: "developer",
    password: "dev123"
};
