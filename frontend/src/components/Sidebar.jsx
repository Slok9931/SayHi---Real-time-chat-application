import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import CreateGroupModal from "./CreateGroupModal";
import { Users, MessageCircle, Plus } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { getGroups, groups, selectedGroup, setSelectedGroup, isGroupsLoading } = useGroupStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("chats"); // "chats" or "groups"
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  const handleChatSelect = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
  };

  return (
    <>
      <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
        {/* Header with Tabs */}
        <div className="border-b border-base-300 w-full p-5">
          <div className="flex items-center gap-2 mb-3 flex-col lg:flex-row">
            <div className="flex-1 flex gap-1 flex-col lg:flex-row">
              <button
                className={`flex-1 btn btn-sm ${activeTab === "chats" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTab("chats")}
              >
                <MessageCircle className="size-4 lg:mr-1" />
                <span className="hidden lg:inline">Chats</span>
              </button>
              <button
                className={`flex-1 btn btn-sm ${activeTab === "groups" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTab("groups")}
              >
                {activeTab !== "groups" && <Users className="size-4 lg:mr-1" />}
                {activeTab === "groups" && <Users className="size-4 lg:block" />}
                <span className="hidden lg:inline">Groups</span>
              </button>
            </div>
            {activeTab === "groups" && (
              <button
                className="btn btn-sm btn-circle btn-primary"
                onClick={() => setShowCreateGroup(true)}
              >
                <Plus className="size-4" />
              </button>
            )}
          </div>

          {/* Online filter for chats */}
          {activeTab === "chats" && (
            <div className="hidden lg:flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOnlineOnly}
                  onChange={(e) => setShowOnlineOnly(e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                <span className="text-sm">Show online only</span>
              </label>
              <span className="text-xs text-zinc-500">({onlineUsers.length} online)</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto w-full py-3">
          {activeTab === "chats" ? (
            <>
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleChatSelect(user)}
                  className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-300 transition-colors
                    ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                  `}
                >
                  <div className="relative mx-auto lg:mx-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.name}
                      className="size-12 object-cover rounded-full"
                    />
                    {onlineUsers.includes(user._id) && (
                      <span
                        className="absolute bottom-0 right-0 size-3 bg-green-500 
                        rounded-full ring-2 ring-zinc-900"
                      />
                    )}
                  </div>

                  <div className="hidden lg:block text-left min-w-0">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div className="text-sm text-zinc-400">
                      {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                    </div>
                  </div>
                </button>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center text-zinc-500 py-4">No online users</div>
              )}
            </>
          ) : (
            <>
              {groups.map((group) => (
                <button
                  key={group._id}
                  onClick={() => handleGroupSelect(group)}
                  className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-300 transition-colors
                    ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                  `}
                >
                  <div className="relative mx-auto lg:mx-0">
                    {group.groupImage ? (
                      <img
                        src={group.groupImage}
                        alt={group.name}
                        className="size-12 object-cover rounded-full"
                      />
                    ) : (
                      <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="size-6 text-primary" />
                      </div>
                    )}
                  </div>

                  <div className="hidden lg:block text-left min-w-0">
                    <div className="font-medium truncate">{group.name}</div>
                    <div className="text-sm text-zinc-400">
                      {group.members.length} members
                    </div>
                  </div>
                </button>
              ))}

              {groups.length === 0 && (
                <div className="text-center text-zinc-500 py-4">
                  <Users className="size-8 mx-auto mb-2 opacity-50" />
                  <p>No groups yet</p>
                  <p className="text-xs">Create your first group!</p>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      <CreateGroupModal 
        isOpen={showCreateGroup} 
        onClose={() => setShowCreateGroup(false)} 
      />
    </>
  );
};

export default Sidebar;