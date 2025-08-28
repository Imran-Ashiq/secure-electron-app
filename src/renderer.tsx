import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app'; // Correct

const root = createRoot(document.getElementById('root'));
root.render(<App />);