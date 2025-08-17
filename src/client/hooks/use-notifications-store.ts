import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Notification {
  id: string;
  title: string;
  content: string;
  date: string;
  version?: string;
  type: 'release' | 'update' | 'announcement';
}

interface NotificationsState {
  viewedNotifications: Set<string>;
  isDialogOpen: boolean;
  notifications: Notification[];

  // Actions
  markAsViewed: (notificationId: string) => void;
  openDialog: () => void;
  closeDialog: () => void;
  hasUnviewedNotifications: () => boolean;
  getLatestNotification: () => Notification | null;
}

const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      viewedNotifications: new Set<string>(),
      isDialogOpen: false,
      notifications: [
        {
          id: 'current-release',
          title: 'Purro Beta Release',
          content: `🧪 **Current Beta Version**

Thank you for using Purro Wallet Beta! 

This version includes multi-chain support, DeFi features, and enhanced security. We're continuously improving the wallet based on user feedback.

If you encounter any issues, please let us know!`,
          date: '2025-08-15',
          version: 'Beta',
          type: 'release',
        },
      ],

      markAsViewed: (notificationId: string) => {
        set(state => ({
          viewedNotifications: new Set([
            ...state.viewedNotifications,
            notificationId,
          ]),
        }));
      },

      openDialog: () => set({ isDialogOpen: true }),
      closeDialog: () => set({ isDialogOpen: false }),

      hasUnviewedNotifications: () => {
        const { notifications, viewedNotifications } = get();
        return notifications.some(
          notification => !viewedNotifications.has(notification.id)
        );
      },

      getLatestNotification: () => {
        const { notifications } = get();
        return notifications.length > 0 ? notifications[0] : null;
      },
    }),
    {
      name: 'purro-notifications',
      partialize: state => ({
        viewedNotifications: Array.from(state.viewedNotifications),
      }),
      onRehydrateStorage: () => state => {
        if (state && Array.isArray(state.viewedNotifications)) {
          state.viewedNotifications = new Set(state.viewedNotifications);
        }
      },
    }
  )
);

export default useNotificationsStore;
