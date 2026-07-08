import apiClient from './client.js';

export async function fetchRooms() {
  const { data } = await apiClient.get('/api/rooms');
  return data.rooms;
}

export async function createRoom(name) {
  const { data } = await apiClient.post('/api/rooms', { name });
  return data.room;
}

export async function fetchMyStats() {
  const { data } = await apiClient.get('/api/users/me/stats');
  return data;
}
