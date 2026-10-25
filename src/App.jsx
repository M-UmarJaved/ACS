import React, { useState } from 'react';
import { SchoolDataProvider } from './context/SchoolDataContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Faculty from './pages/Faculty';
import Facilities from './pages/Facilities';
import Contact from './pages/Contact';
import Login from './pages/Login';
import StudentPortal from './pages/StudentPortal';
import AdminPortal from './pages/AdminPortal';
import DeveloperPanel from './pages/DeveloperPanel';
import Blog from './pages/Blog';
import WhatsAppButton from './components/WhatsAppButton';

function App() {
    const [currentPage, setCurrentPage] = useState('home');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isDeveloper, setIsDeveloper] = useState(false);
    const [loggedInStudent, setLoggedInStudent] = useState(null);

    const renderPage = () => {
        switch (currentPage) {
            case 'home':
                return <Home setCurrentPage={setCurrentPage} />;
            case 'about':
                return <About setCurrentPage={setCurrentPage} />;
            case 'faculty':
                return <Faculty />;
            case 'facilities':
                return <Facilities />;
            case 'contact':
                return <Contact />;
            case 'blog':
                return <Blog />;
            case 'login':
                return (
                    <Login
                        setIsLoggedIn={setIsLoggedIn}
                        setIsAdmin={setIsAdmin}
                        setIsDeveloper={setIsDeveloper}
                        setCurrentPage={setCurrentPage}
                        setLoggedInStudent={setLoggedInStudent}
                    />
                );
            case 'portal':
                return (
                    <StudentPortal
                        student={loggedInStudent}
                        setIsLoggedIn={setIsLoggedIn}
                        setCurrentPage={setCurrentPage}
                        setLoggedInStudent={setLoggedInStudent}
                    />
                );
            case 'admin':
                return (
                    <AdminPortal
                        setIsAdmin={setIsAdmin}
                        setCurrentPage={setCurrentPage}
                    />
                );
            case 'developer':
                return (
                    <DeveloperPanel
                        setIsDeveloper={setIsDeveloper}
                        setCurrentPage={setCurrentPage}
                    />
                );
            default:
                return <Home setCurrentPage={setCurrentPage} />;
        }
    };

    const isDashboard = currentPage === 'portal' || currentPage === 'admin' || currentPage === 'developer';

    return (
        <SchoolDataProvider>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                {!isDashboard && (
                    <Navbar
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        isLoggedIn={isLoggedIn}
                        isAdmin={isAdmin}
                        isDeveloper={isDeveloper}
                    />
                )}
                <main style={{ flex: 1, display: isDashboard ? 'flex' : 'block', flexDirection: 'column' }}>
                    {renderPage()}
                </main>
                {!isDashboard && <Footer setCurrentPage={setCurrentPage} />}
                {!isDashboard && <WhatsAppButton />}
            </div>
        </SchoolDataProvider>
    );
}

export default App;
