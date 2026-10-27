import { api } from "../../lib/api";

/** Thin, typed-by-convention wrappers around the REST API. No React in here. */
export const searchUsers = async (term, signal) => {
  const { data } = await api.get("/user", { params: { search: term }, signal });
  return data;
};

export const openDirectChat = async (userId) => (await api.post("/chat", { userId })).data;

export const createGroup = async ({ name, userIds }) =>
  (await api.post("/chat/group", { name, users: userIds })).data;

export const renameGroup = async (chatId, chatName) =>
  (await api.patch(`/chat/${chatId}`, { chatName })).data;

export const addMember = async (chatId, userId) =>
  (await api.post(`/chat/${chatId}/members`, { userId })).data;

export const removeMember = async (chatId, userId) =>
  (await api.delete(`/chat/${chatId}/members/${userId}`)).data;

export const leaveGroup = async (chatId) => (await api.post(`/chat/${chatId}/leave`)).data;

export const updateProfile = async (patch) => (await api.patch("/user/me", patch)).data;
