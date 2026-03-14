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
import Admin from './pages/Admin';
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
          <Route path="/admin" element={<Admin />} />
          <Route path="/notices" element={<PostList mode="notices" />} />
          <Route path="/notices/create" element={<PostCreate postType="notice" />} />
          <Route path="/notices/:id" element={<PostDetail postType="notice" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
