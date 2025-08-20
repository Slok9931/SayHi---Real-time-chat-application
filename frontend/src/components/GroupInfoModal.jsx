import { useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { X, Users, Edit, Camera, UserPlus, UserMinus } from "lucide-react";

const GroupInfoModal = ({ isOpen, onClose }) => {
  const { selectedGroup, updateGroup, addMemberToGroup, removeMemberFromGroup } = useGroupStore();
  const { authUser } = useAuthStore();
  const { users } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    groupImage: null
  });

  if (!isOpen || !selectedGroup) return null;

  const isAdmin = selectedGroup.admin._id === authUser._id;
  const availableUsers = users.filter(user => 
    !selectedGroup.members.find(member => member._id === user._id)
  );

  const handleEdit = () => {
    setFormData({
      name: selectedGroup.name,
      description: selectedGroup.description || "",
      groupImage: selectedGroup.groupImage
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateGroup(selectedGroup._id, formData);
      setIsEditing(false);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData({ ...formData, groupImage: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleAddMember = async (userId) => {
    try {
      await addMemberToGroup(selectedGroup._id, userId);
      setShowAddMember(false);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleRemoveMember = async (userId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        await removeMemberFromGroup(selectedGroup._id, userId);
      } catch (error) {
        // Error handled in store
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Group Info</h2>
            <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Group Image and Name */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-base-200 flex items-center justify-center overflow-hidden mb-3">
                {formData.groupImage || selectedGroup.groupImage ? (
                  <img 
                    src={formData.groupImage || selectedGroup.groupImage} 
                    alt="Group" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Users className="w-8 h-8 text-base-content/40" />
                )}
              </div>
              {isEditing && isAdmin && (
                <label className="absolute bottom-2 right-0 bg-primary text-primary-content p-1 rounded-full cursor-pointer">
                  <Camera className="w-3 h-3" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <textarea
                  className="textarea textarea-bordered w-full resize-none"
                  placeholder="Group description"
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="btn btn-primary btn-sm">
                    Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn btn-outline btn-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium">{selectedGroup.name}</h3>
                {selectedGroup.description && (
                  <p className="text-sm text-base-content/70 mt-1">{selectedGroup.description}</p>
                )}
                {isAdmin && (
                  <button onClick={handleEdit} className="btn btn-sm btn-ghost mt-2">
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Members Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Members ({selectedGroup.members.length})</h4>
              {isAdmin && (
                <button 
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="btn btn-sm btn-ghost"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Add Member Section */}
            {showAddMember && availableUsers.length > 0 && (
              <div className="border border-base-300 rounded-lg p-3 max-h-32 overflow-y-auto">
                <h5 className="text-sm font-medium mb-2">Add Members</h5>
                {availableUsers.map(user => (
                  <div key={user._id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-sm">{user.fullName}</span>
                    </div>
                    <button
                      onClick={() => handleAddMember(user._id)}
                      className="btn btn-xs btn-primary"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedGroup.members.map(member => (
                <div key={member._id} className="flex items-center justify-between p-2 hover:bg-base-200 rounded">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.profilePic || "/avatar.png"}
                      alt={member.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <span className="text-sm font-medium">{member.fullName}</span>
                      {member._id === selectedGroup.admin._id && (
                        <span className="text-xs text-primary ml-2">Admin</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && member._id !== authUser._id && (
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      className="btn btn-xs btn-ghost text-error"
                    >
                      <UserMinus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;