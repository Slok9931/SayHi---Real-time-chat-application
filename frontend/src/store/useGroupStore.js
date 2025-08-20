import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  isCreatingGroup: false,

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (groupData) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/groups/create", groupData);
      set({ groups: [...get().groups, res.data] });
      toast.success("Group created successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      throw error;
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  sendGroupMessage: async (groupId, messageData) => {
    const { groupMessages } = get();
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/send`, messageData);
      set({ groupMessages: [...groupMessages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  addMemberToGroup: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/add-member`, { memberId });
      const updatedGroups = get().groups.map(group => 
        group._id === groupId ? res.data : group
      );
      set({ groups: updatedGroups });
      if (get().selectedGroup?._id === groupId) {
        set({ selectedGroup: res.data });
      }
      toast.success("Member added successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    }
  },

  removeMemberFromGroup: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/remove-member`, { memberId });
      const updatedGroups = get().groups.map(group => 
        group._id === groupId ? res.data : group
      );
      set({ groups: updatedGroups });
      if (get().selectedGroup?._id === groupId) {
        set({ selectedGroup: res.data });
      }
      toast.success("Member removed successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  },

  updateGroup: async (groupId, updateData) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, updateData);
      const updatedGroups = get().groups.map(group => 
        group._id === groupId ? res.data : group
      );
      set({ groups: updatedGroups });
      if (get().selectedGroup?._id === groupId) {
        set({ selectedGroup: res.data });
      }
      toast.success("Group updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
    }
  },

  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newGroupMessage", (newMessage) => {
      const isMessageFromSelectedGroup = newMessage.groupId === selectedGroup._id;
      if (!isMessageFromSelectedGroup) return;

      set({
        groupMessages: [...get().groupMessages, newMessage],
      });
    });

    socket.on("newGroup", (newGroup) => {
      set({
        groups: [...get().groups, newGroup],
      });
    });

    socket.on("groupUpdated", (updatedGroup) => {
      const updatedGroups = get().groups.map(group => 
        group._id === updatedGroup._id ? updatedGroup : group
      );
      set({ groups: updatedGroups });
      if (get().selectedGroup?._id === updatedGroup._id) {
        set({ selectedGroup: updatedGroup });
      }
    });

    socket.on("removedFromGroup", (groupId) => {
      const filteredGroups = get().groups.filter(group => group._id !== groupId);
      set({ groups: filteredGroups });
      if (get().selectedGroup?._id === groupId) {
        set({ selectedGroup: null, groupMessages: [] });
      }
    });
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newGroupMessage");
    socket.off("newGroup");
    socket.off("groupUpdated");
    socket.off("removedFromGroup");
  },

  setSelectedGroup: (selectedGroup) => set({ selectedGroup }),
  clearGroupMessages: () => set({ groupMessages: [] }),
}));