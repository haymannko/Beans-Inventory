import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi'
import type { User } from '../types'

export default function Users() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
  })

  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/users')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; role: string }) => {
      const response = await apiClient.post('/users', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
      setIsModalOpen(false)
      setFormData({ username: '', password: '', role: 'staff' })
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to create'
        : 'Failed to create'
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { username?: string; role?: string } }) => {
      const response = await apiClient.put(`/users/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated successfully')
      setEditingId(null)
      setFormData({ username: '', password: '', role: 'staff' })
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to update'
        : 'Failed to update'
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiClient.delete(`/users/${id}`) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted successfully')
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to delete'
        : 'Failed to delete'
      toast.error(msg)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage system users and roles</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="table-header">Username</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Created</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users?.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500"><FiUsers className="w-8 h-8 mx-auto mb-2 text-gray-400" />No users found</td></tr>
                ) : users?.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="table-cell font-medium">{user.username}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingId(user.id); setFormData({ username: user.username, password: '', role: user.role }) }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm('Are you sure?')) deleteMutation.mutate(user.id) }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"><FiTrash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add User">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="input-field" minLength={3} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input-field" minLength={6} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })} className="input-field">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create User</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit User">
        <form onSubmit={(e) => { e.preventDefault(); if (editingId) updateMutation.mutate({ id: editingId, data: { username: formData.username, role: formData.role } }) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="input-field" minLength={3} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })} className="input-field">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Update User</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
