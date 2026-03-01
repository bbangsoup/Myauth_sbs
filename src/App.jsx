import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import Profile from './pages/Profile';
import PostList from './pages/PostList';
import PostCreate from './pages/PostCreate';
import PostDetail from './pages/PostDetail';
import { AuthProvider } from './contexts/AuthProvider';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/posts" element={<PostList />} />
          <Route path="/posts/create" element={<PostCreate />} />
          <Route path="/posts/:id" element={<PostDetail />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
