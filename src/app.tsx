
import React, { useState, useEffect } from 'react';
import './index.css';

// Application authentication states
type AppState = 'logged-out' | 'loading' | 'logged-in';

// User profile structure returned from Auth0
interface UserProfile {
  name: string;      // Full name of the user
  email: string;     // Email address
  nickname?: string; // Optional display name
  picture?: string;  // Optional profile image URL
  sub?: string;      // Optional unique identifier
}


// Main application component
export const App: React.FC = () => {
  // State: tracks authentication status
  const [authState, setAuthState] = useState<AppState>('logged-out');
  // State: stores user profile after successful login
  const [user, setUser] = useState<UserProfile | null>(null);

  // Set up IPC listeners for authentication events from the main process
  useEffect(() => {
    // On successful login, update user profile and state
    window.electronAPI.onAuthSuccess((profile: UserProfile) => {
      // For debugging: log profile image URL
      console.log('Profile picture URL:', profile.picture);
      setUser(profile);
      setAuthState('logged-in');
    });
    // On logout, clear user profile and reset state
    window.electronAPI.onLogout(() => {
      setUser(null);
      setAuthState('logged-out');
    });
  }, []);

  // Handler: triggers logout via main process
  const handleLogoutClick = () => {
    window.electronAPI.logout();
  };

  // Handler: triggers login flow via main process
  const handleLoginClick = () => {
    setAuthState('loading'); // Show loading UI
    window.electronAPI.startLogin(); // Start OIDC login
  };

  // Render UI based on authentication state
  return (
    <div>
      {/* Show loading indicator during authentication */}
      {authState === 'loading' && (
        <div className="app-card">
          <h2>Authenticating...</h2>
        </div>
      )}
      {/* Show user info and logout button when logged in */}
      {authState === 'logged-in' && (
        <div className="app-card">
          <h2>Welcome, {user?.nickname || user?.name}</h2>
          <p>Email: {user?.email}</p>
          {/* Display profile image if available */}
          {user?.picture && (
            <img
              src={user.picture}
              alt="User profile"
              style={{ borderRadius: '50%', width: '100px', height: '100px' }}
            />
          )}
          <br />
          <button onClick={handleLogoutClick}>Logout</button>
        </div>
      )}
      {/* Show login prompt when logged out */}
      {authState === 'logged-out' && (
        <div className="app-card">
          <h1>Secure Electron App</h1>
          <p>Please log in to continue.</p>
          <button onClick={handleLoginClick}>
            Login with Enterprise Account
          </button>
        </div>
      )}
    </div>
  );
};