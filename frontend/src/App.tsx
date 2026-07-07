import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import BeanTypes from './pages/BeanTypes'
import WeightMaster from './pages/WeightMaster'
import Arrivals from './pages/Arrivals'
import Sales from './pages/Sales'
import Storages from './pages/Storage'
import Adjustments from './pages/Adjustments'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Boucher from './pages/Boucher'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="bean-types" element={<BeanTypes />} />
        <Route path="weight-master" element={<WeightMaster />} />
        <Route path="arrivals" element={<Arrivals />} />
        <Route path="sales" element={<Sales />} />
        <Route path="storage" element={<Storages />} />
        <Route path="adjustments" element={<Adjustments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<ProtectedRoute requiredRole="admin"><Users /></ProtectedRoute>} />
        <Route path="settings" element={<Settings />} />
        <Route path="bouncher" element={<Boucher />} />
      </Route>
    </Routes>
  )
}
