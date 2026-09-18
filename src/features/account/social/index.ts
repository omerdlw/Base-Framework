export { SocialRealtimeSync } from "./realtime";
export { default as NotificationsModal } from "./components/modals/notifications-modal";

export {
  FOLLOW_STATUSES,
  acceptFollowRequest,
  fetchFollowRequests,
  fetchFollowers,
  fetchFollowing,
  fetchInboxCount,
  followUser,
  getFollowState,
  rejectFollowRequest,
  removeFollower,
  unfollowUser,
} from "./client/follows";
export type {
  FollowRecord,
  FollowStatus,
  FollowUserResult,
} from "./client/follows";

export {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAllAsRead,
  markAsRead,
} from "./client/notifications";
export type {
  FetchNotificationsOptions,
  NotificationRecord,
} from "./client/notifications";
