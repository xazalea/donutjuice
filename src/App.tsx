import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { StartPage } from './pages/StartPage'
import { SearchPage } from './pages/SearchPage'
import { ExploitPage } from './pages/ExploitPage'
import { Layout } from './components/Layout'
import './App.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Navigate to="/start" replace /> },
      { path: '/start', element: <StartPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/exploit', element: <ExploitPage /> },
    ]
  }
])

function App() {
  return <RouterProvider router={router} />
}

export default App
