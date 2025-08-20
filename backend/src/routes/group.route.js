import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupMessages,
  sendGroupMessage,
  addMemberToGroup,
  removeMemberFromGroup,
  updateGroup
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/", protectRoute, getUserGroups);
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/send", protectRoute, sendGroupMessage);
router.post("/:groupId/add-member", protectRoute, addMemberToGroup);
router.post("/:groupId/remove-member", protectRoute, removeMemberFromGroup);
router.put("/:groupId", protectRoute, updateGroup);

export default router;