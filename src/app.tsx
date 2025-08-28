import React, { useState, useEffect } from 'react';

// Define the possible states for our application UI
type AppState = 'logged-out' | 'loading' | 'logged-in';

interface UserProfile {
  name: string;
  email: string;
  nickname?: string;
  picture?: string;
  sub?: string;
}

export const App = () => {
  const [authState, setAuthState] = useState<AppState>('logged-out');
  const [user, setUser] = useState<UserProfile | null>(null);

  // This effect runs only once to set up the IPC listener
  useEffect(() => {
    // Listener for successful login
    window.electronAPI.onAuthSuccess((profile) => {
      setUser(profile);
      setAuthState('logged-in');
    });

    // Listener for logout completion
    window.electronAPI.onLogout(() => {
      setUser(null);
      setAuthState('logged-out');
    });
  }, []);

  // Handler for logout button
  const handleLogoutClick = () => {
    window.electronAPI.logout();
  };

  // This is our new handler function
  const handleLoginClick = () => {
    setAuthState('loading'); // First, set the UI state to loading
    window.electronAPI.startLogin(); // Then, call the original, unmodified API
  };

  const renderContent = () => {
    switch (authState) {
      case 'loading':
        return <h2>Authenticating...</h2>;
      
      case 'logged-in':
        return (
          <div>
            <h2>Welcome, {user?.nickname || user?.name}</h2>
            <p>Email: {user?.email}</p>
            {user?.picture && <img src={user.picture} alt="User profile" style={{ borderRadius: '50%', width: '100px', height: '100px' }} />}
            <br />
            <button onClick={handleLogoutClick}>Logout</button>
          </div>
        );
        
      case 'logged-out':
      default:
        return (
          <div>
            <h1>Secure Electron App</h1>
            <p>Please log in to continue.</p>
            {/* Call our new handler function on click */}
            <button onClick={handleLoginClick}>
              Login with Enterprise Account
            </button>
          </div>
        );
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      {renderContent()}
    </div>
  );
};