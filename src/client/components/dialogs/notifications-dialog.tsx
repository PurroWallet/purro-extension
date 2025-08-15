import {
  DialogWrapper,
  DialogHeader,
  DialogContent,
} from '@/client/components/ui';
import useNotificationsStore from '@/client/hooks/use-notifications-store';
import useDialogStore from '@/client/hooks/use-dialog-store';
import { BellIcon, CalendarIcon, TagIcon, XIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationsDialog = () => {
  const { notifications, viewedNotifications, markAsViewed } =
    useNotificationsStore();

  const { closeDialog } = useDialogStore();

  const handleNotificationClick = (notificationId: string) => {
    markAsViewed(notificationId);
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.trim().startsWith('•')) {
        return (
          <li key={index} className="ml-4 text-sm text-gray-300">
            {line.replace('•', '').trim()}
          </li>
        );
      }
      if (line.includes('**') && line.includes('**')) {
        const parts = line.split('**');
        return (
          <p key={index} className="text-sm text-white mb-2">
            {parts.map((part, i) => (
              <span
                key={i}
                className={
                  i % 2 === 1
                    ? 'font-semibold text-[var(--primary-color-light)]'
                    : ''
                }
              >
                {part}
              </span>
            ))}
          </p>
        );
      }
      if (line.trim()) {
        return (
          <p key={index} className="text-sm text-gray-300 mb-2">
            {line.trim()}
          </p>
        );
      }
      return <br key={index} />;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'release':
        return <TagIcon className="size-4 text-green-400" />;
      case 'update':
        return <BellIcon className="size-4 text-blue-400" />;
      default:
        return <BellIcon className="size-4 text-yellow-400" />;
    }
  };

  return (
    <DialogWrapper>
      <DialogHeader
        icon={<XIcon className="size-4 text-white" />}
        title="Notifications"
        onClose={closeDialog}
      />

      <DialogContent>
        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <BellIcon className="size-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map(notification => {
              const isViewed = viewedNotifications.has(notification.id);

              return (
                <div
                  key={notification.id}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer hover:bg-white/5 ${
                    isViewed
                      ? 'border-gray-600 bg-gray-800/30'
                      : 'border-[var(--primary-color-light)]/30 bg-[var(--primary-color-light)]/5'
                  }`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  {/* Unread indicator */}
                  {!isViewed && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--primary-color-light)] rounded-full" />
                  )}

                  {/* Notification Header */}
                  <div className="flex items-start gap-3 mb-3">
                    {getTypeIcon(notification.type)}
                    <div className="flex-1">
                      <h3
                        className={`font-medium mb-1 ${
                          isViewed ? 'text-gray-300' : 'text-white'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <CalendarIcon className="size-3" />
                        <span>
                          {formatDistanceToNow(new Date(notification.date), {
                            addSuffix: true,
                          })}
                        </span>
                        {notification.version && (
                          <>
                            <span>•</span>
                            <span className="text-[var(--primary-color-light)]">
                              {notification.version}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notification Content */}
                  <div
                    className={`space-y-1 ${
                      isViewed ? 'text-gray-400' : 'text-gray-300'
                    }`}
                  >
                    {formatContent(notification.content)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </DialogWrapper>
  );
};

export default NotificationsDialog;
