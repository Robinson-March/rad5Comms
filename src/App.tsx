// src/App.tsx
import { BrowserRouter, Routes, Route,
  //  Navigate
   } from 'react-router-dom';
import HomePage from './pages/homePage'; 
import Auth from './pages/Auth';
// import Settings from './pages/Settings';
// import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main authenticated/home route */}
        <Route path="/" element={<Auth />} />
        
        {/* Optional: redirect root to home (or dashboard) */}
        {/* <Route path="/home" element={<Navigate to="/" replace />} /> */}

        {/* Example future routes – uncomment/add when you create these pages */}
        
        <Route path="/home" element={<HomePage />} />
        {/* <Route path="/settings" element={<Settings />} /> */}
        {/* <Route path="/channel/:id" element={<ChannelPage />} /> */}
        {/* <Route path="/dm/:userId" element={<DirectMessagePage />} /> */}
       

        {/* Catch-all route for 404 */}
        <Route path="*" element={
          <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-800">404</h1>
              <p className="mt-4 text-xl text-gray-600">Page not found</p>
              <a href="/home" className="mt-6 inline-block text-blue-600 hover:underline">
                Go back to home
              </a>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;