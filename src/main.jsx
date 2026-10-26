import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App.jsx'
import { AuthProvider } from './features/auth/AuthProvider.jsx'
import { ThemeProvider } from './features/theme/ThemeProvider.jsx'
import './styles.css'
import './theme.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode><ThemeProvider><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></ThemeProvider></React.StrictMode>,
)
