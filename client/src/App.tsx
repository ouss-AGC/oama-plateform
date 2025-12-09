import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import StudentForm from './components/StudentForm';
import PinEntry from './components/PinEntry';
import WaitingRoom from './components/WaitingRoom';
import Quiz from './components/Quiz';
import Results from './components/Results';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import StudentDetail from './components/StudentDetail';
import Resources from './components/Resources';

import CertificatePreview from './components/CertificatePreview';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/pin" element={<PinEntry />} />
        <Route path="/register" element={<StudentForm />} />
        <Route path="/waiting-room" element={<WaitingRoom />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/results" element={<Results />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/certificates" element={<CertificatePreview />} />
        <Route path="/admin/student/:timestamp" element={<StudentDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
