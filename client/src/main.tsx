import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add Vite HMR error handling
if (import.meta.hot) {
  import.meta.hot.on('vite:error', (err) => {
    console.error('Vite HMR Error:', err);
  });

  import.meta.hot.on('vite:beforeUpdate', () => {
    console.log('Vite updating...');
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Initialize theme from localStorage or system preference
const initializeTheme = () => {
  const theme = localStorage.getItem("theme");

  if (!theme) {
    // If no theme is set, detect from system preference
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", systemPrefersDark);
  } else {
    // Use the saved theme
    document.documentElement.classList.toggle("dark", theme === "dark");
  }

  // Listen for system preference changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    // Only auto-update if no theme preference has been explicitly set
    if (!localStorage.getItem("theme")) {
      document.documentElement.classList.toggle("dark", e.matches);
    }
  });
};

initializeTheme();