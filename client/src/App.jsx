import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from '@/pages/Menu';
import Admin from '@/pages/Admin'; // We will create this next
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
