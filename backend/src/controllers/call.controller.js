import Call from "../models/call.model.js";
import Group from "../models/group.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { v4 as uuidv4 } from "uuid";

export const initiateCall = async (req, res) => {
  try {
    const { receiverId, groupId, callType, chatType } = req.body;
    const callerId = req.user._id;
    const callId = uuidv4();

    // Validate call type and chat type
    if (!['voice', 'video'].includes(callType)) {
      return res.status(400).json({ error: "Invalid call type" });
    }
    if (!['direct', 'group'].includes(chatType)) {
      return res.status(400).json({ error: "Invalid chat type" });
    }

    let participants = [];
    let targetUsers = [];

    if (chatType === 'direct') {
      if (!receiverId) {
        return res.status(400).json({ error: "Receiver ID is required for direct calls" });
      }
      participants = [
        { userId: callerId, status: 'joined' },
        { userId: receiverId, status: 'calling' }
      ];
      targetUsers = [receiverId];
    } else if (chatType === 'group') {
      if (!groupId) {
        return res.status(400).json({ error: "Group ID is required for group calls" });
      }
      
      const group = await Group.findById(groupId);
      if (!group || !group.members.includes(callerId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      participants = group.members.map(memberId => ({
        userId: memberId,
        status: memberId.toString() === callerId.toString() ? 'joined' : 'calling'
      }));
      targetUsers = group.members.filter(memberId => memberId.toString() !== callerId.toString());
    }

    const newCall = new Call({
      callId,
      caller: callerId,
      participants,
      callType,
      chatType,
      groupId: chatType === 'group' ? groupId : undefined,
      receiverId: chatType === 'direct' ? receiverId : undefined,
      startedAt: new Date()
    });

    await newCall.save();

    // Populate call data
    const populatedCall = await Call.findById(newCall._id)
      .populate('caller', 'fullName profilePic')
      .populate('participants.userId', 'fullName profilePic')
      .populate('groupId', 'name groupImage');

    // Notify target users via socket
    targetUsers.forEach(userId => {
      const userSocketId = getReceiverSocketId(userId.toString());
      if (userSocketId) {
        io.to(userSocketId).emit("incoming-call", populatedCall);
      }
    });

    res.status(201).json(populatedCall);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const answerCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { answer } = req.body;
    const userId = req.user._id;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }

    // Update participant status
    const participant = call.participants.find(p => p.userId.toString() === userId.toString());
    if (!participant) {
      return res.status(403).json({ error: "Not a participant in this call" });
    }

    if (answer) {
      participant.status = 'joined';
      participant.joinedAt = new Date();
      call.status = 'ongoing';
    } else {
      participant.status = 'declined';
      // Check if all participants declined
      const activeParticipants = call.participants.filter(p => 
        p.status === 'joined' || p.status === 'calling'
      );
      if (activeParticipants.length === 0) {
        call.status = 'declined';
        call.endedAt = new Date();
      }
    }

    await call.save();

    const populatedCall = await Call.findById(call._id)
      .populate('caller', 'fullName profilePic')
      .populate('participants.userId', 'fullName profilePic')
      .populate('groupId', 'name groupImage');

    // Notify all participants
    call.participants.forEach(participant => {
      const userSocketId = getReceiverSocketId(participant.userId.toString());
      if (userSocketId) {
        io.to(userSocketId).emit("call-answered", {
          callId,
          answer,
          userId,
          call: populatedCall
        });
      }
    });

    res.status(200).json(populatedCall);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }

    const participant = call.participants.find(p => p.userId.toString() === userId.toString());
    if (!participant) {
      return res.status(403).json({ error: "Not a participant in this call" });
    }

    participant.status = 'left';
    participant.leftAt = new Date();

    // Check if all participants left
    const activeParticipants = call.participants.filter(p => 
      p.status === 'joined' || p.status === 'calling'
    );
    
    if (activeParticipants.length === 0) {
      call.status = 'ended';
      call.endedAt = new Date();
      if (call.startedAt) {
        call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
      }
    }

    await call.save();

    // Notify all participants
    call.participants.forEach(participant => {
      const userSocketId = getReceiverSocketId(participant.userId.toString());
      if (userSocketId) {
        io.to(userSocketId).emit("call-ended", { callId, userId, call });
      }
    });

    res.status(200).json({ message: "Call ended successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserCalls = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const calls = await Call.find({
      $or: [
        { caller: userId },
        { 'participants.userId': userId }
      ]
    })
    .populate('caller', 'fullName profilePic')
    .populate('participants.userId', 'fullName profilePic')
    .populate('groupId', 'name groupImage')
    .sort({ createdAt: -1 })
    .limit(50);

    res.status(200).json(calls);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};