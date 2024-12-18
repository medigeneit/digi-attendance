import { defineStore } from 'pinia'
import apiClient from '../axios'

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [],
    user: null,
    error: null,
  }),

  actions: {
    async fetchUsers() {
      try {
        const response = await apiClient.get('/users')
        this.users = response.data
        this.error = null
      } catch (error) {
        this.error = error.response?.data?.message || 'Something went wrong'
      }
    },

    async fetchUser(id) {
      try {
        const response = await apiClient.get(`/users/${id}`)
        this.user = response.data
        this.error = null
      } catch (error) {
        this.error = error.response?.data?.message || 'Something went wrong'
      }
    },

    async createUser(payload) {
      try {
        const response = await apiClient.post('/users', payload)
        this.users.push(response.data.user)
        this.error = null
      } catch (error) {
        this.error = error.response?.data?.message || 'Something went wrong'
      }
    },

    async updateUser(id, payload) {
      try {
        const response = await apiClient.put(`/users/${id}`, payload)

        const index = this.users.findIndex((user) => user.id === id)
        if (index !== -1) {
          this.users[index] = response.data.user
        }
        this.error = null
      } catch (error) {
        this.error = error.response?.data?.message || 'Something went wrong'
      }
    },

    async deleteUser(id) {
      try {
        await apiClient.delete(`/users/${id}`)
        this.users = this.users.filter((user) => user.id !== id)
        this.error = null
      } catch (error) {
        this.error = error.response?.data?.message || 'Something went wrong'
      }
    },

  },
})
