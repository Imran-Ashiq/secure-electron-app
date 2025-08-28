// scripts/test-cleanup.js
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const appName = 'secure-electron-app'; // Your app's product name

console.log('--- Starting cleanup script ---');

function killProcesses() {
  console.log('Attempting to kill lingering processes...');
  try {
    if (process.platform === 'win32') {
      // Force kill all Electron processes and their children
      execSync(`taskkill /F /IM electron.exe /T 2>nul`, { stdio: 'ignore' });
      // Also target your specific app name
      execSync(`taskkill /F /IM "${appName}.exe" /T 2>nul`, { stdio: 'ignore' });
    } else {
      execSync(`pkill -f "electron" || true`, { stdio: 'ignore' });
      execSync(`pkill -f "${appName}" || true`, { stdio: 'ignore' });
    }
    console.log('Process kill commands executed.');
  } catch (error) {
    // This is expected if no processes are found to kill
    console.warn('Could not kill processes (this is often normal):', error.message);
  }
}

function cleanArtifacts() {
  console.log('Attempting to clean build artifacts and user data...');
  const dirsToRemove = [
    path.join(__dirname, '..', 'out'), // The main build output
    path.join(process.env.APPDATA, appName) // The user data directory
  ];

  dirsToRemove.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.removeSync(dir);
        console.log(`Successfully removed: ${dir}`);
      } catch (error) {
        console.warn(`Could not remove ${dir}. It might be locked. Error: ${error.message}`);
      }
    }
  });
}

// Run cleanup functions
killProcesses();
cleanArtifacts();

// A final, forceful kill after a short delay to be absolutely sure
setTimeout(() => {
  killProcesses();
  console.log('--- Cleanup script finished ---');
}, 1000); // 1-second delay