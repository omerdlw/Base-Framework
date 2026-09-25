export { SocialRealtimeSync } from "./realtime";
export {
  ACCOUNT_NOTIFICATIONS_SURFACE_ID,
  AccountNotificationsSurface,
  createAccountNotificationsSurfaceEntry,
  default as NotificationsSurface,
  default as NotificationsModal,
} from "../components/dock/account-notifications-surface";

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
