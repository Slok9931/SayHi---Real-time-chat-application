import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const createGroup = async (req, res) => {
  try {
    const { name, description, members, groupImage } = req.body;
    const adminId = req.user._id;

    if (!name || !members || members.length < 1) {
      return res.status(400).json({ message: "Group name and at least 1 member are required" });
    }

    // Ensure admin is included in members
    const allMembers = [...new Set([adminId.toString(), ...members])];

    let imageUrl;
    if (groupImage) {
      const uploadResponse = await cloudinary.uploader.upload(groupImage);
      imageUrl = uploadResponse.secure_url;
    }

    const newGroup = new Group({
      name,
      description,
      admin: adminId,
      members: allMembers,
      groupImage: imageUrl
    });

    await newGroup.save();
    
    // Populate the group with member details
    const populatedGroup = await Group.findById(newGroup._id)
      .populate('members', 'fullName email profilePic')
      .populate('admin', 'fullName email profilePic');

    // Notify all members about the new group via socket
    allMembers.forEach(memberId => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("newGroup", populatedGroup);
      }
    });

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.log("Error in createGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const groups = await Group.find({ 
      members: userId,
      isActive: true 
    })
    .populate('members', 'fullName email profilePic')
    .populate('admin', 'fullName email profilePic')
    .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.log("Error in getUserGroups controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await Message.find({ 
      groupId,
      messageType: 'group'
    })
    .populate('senderId', 'fullName profilePic')
    .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(senderId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image: imageUrl,
      messageType: 'group'
    });

    await newMessage.save();
    
    // Populate sender details
    await newMessage.populate('senderId', 'fullName profilePic');

    // Send message to all group members via socket
    group.members.forEach(memberId => {
      const memberSocketId = getReceiverSocketId(memberId.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("newGroupMessage", newMessage);
      }
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendGroupMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addMemberToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is admin
    if (group.admin.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only admin can add members" });
    }

    // Check if member already exists
    if (group.members.includes(memberId)) {
      return res.status(400).json({ error: "User is already a member" });
    }

    group.members.push(memberId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate('members', 'fullName email profilePic')
      .populate('admin', 'fullName email profilePic');

    // Notify all members including the new member
    updatedGroup.members.forEach(member => {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupUpdated", updatedGroup);
      }
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in addMemberToGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeMemberFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is admin or removing themselves
    if (group.admin.toString() !== userId.toString() && memberId !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    group.members = group.members.filter(member => member.toString() !== memberId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate('members', 'fullName email profilePic')
      .populate('admin', 'fullName email profilePic');

    // Notify all remaining members
    updatedGroup.members.forEach(member => {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupUpdated", updatedGroup);
      }
    });

    // Notify the removed member
    const removedMemberSocketId = getReceiverSocketId(memberId);
    if (removedMemberSocketId) {
      io.to(removedMemberSocketId).emit("removedFromGroup", groupId);
    }

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in removeMemberFromGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, groupImage } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is admin
    if (group.admin.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only admin can update group" });
    }

    let imageUrl = group.groupImage;
    if (groupImage && groupImage !== group.groupImage) {
      const uploadResponse = await cloudinary.uploader.upload(groupImage);
      imageUrl = uploadResponse.secure_url;
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { 
        name: name || group.name,
        description: description !== undefined ? description : group.description,
        groupImage: imageUrl 
      },
      { new: true }
    )
    .populate('members', 'fullName email profilePic')
    .populate('admin', 'fullName email profilePic');

    // Notify all members
    updatedGroup.members.forEach(member => {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupUpdated", updatedGroup);
      }
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in updateGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};