import React, { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const NotificationList = () => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (filter === 'unread') params.is_read = false;
      if (filter === 'read') params.is_read = true;
      const response = await notificationService.getAll(params);
      setNotifications(response.data);
      setPagination({ next: response.next, previous: response.previous, count: response.count });
      setLoading(false);
    } catch (err) {
      setError('Error fetching notifications');
      setLoading(false);
    }
  }, [page, filter]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.count || 0);
    } catch (err) {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [fetchNotifications, fetchUnreadCount, isAuthenticated]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError('Error marking notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError('Error marking all notifications as read');
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'APPOINTMENT': return 'bg-primary';
      case 'PRESCRIPTION': return 'bg-info';
      case 'LAB_RESULT': return 'bg-success';
      case 'BILLING': return 'bg-warning text-dark';
      case 'SYSTEM': return 'bg-secondary';
      case 'REMINDER': return 'bg-purple';
      default: return 'bg-secondary';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return <i className="fas fa-exclamation-circle text-danger me-2" title={priority}></i>;
      case 'MEDIUM':
        return <i className="fas fa-exclamation-triangle text-warning me-2" title={priority}></i>;
      default:
        return <i className="fas fa-info-circle text-info me-2" title="Normal"></i>;
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          <i className="fas fa-sign-in-alt me-2"></i>
          Please log in to view your notifications.
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="fas fa-bell me-2"></i>
            Notifications
            {unreadCount > 0 && (
              <span className="badge bg-danger ms-2">{unreadCount} unread</span>
            )}
          </h2>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline-primary" onClick={handleMarkAllRead}>
            <i className="fas fa-check-double me-2"></i>
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'all' ? 'active' : ''}`}
            onClick={() => { setFilter('all'); setPage(1); }}
          >
            All
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => { setFilter('unread'); setPage(1); }}
          >
            Unread
            {unreadCount > 0 && <span className="badge bg-danger ms-1">{unreadCount}</span>}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'read' ? 'active' : ''}`}
            onClick={() => { setFilter('read'); setPage(1); }}
          >
            Read
          </button>
        </li>
      </ul>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center mt-5"><div className="spinner-border"></div></div>
      ) : notifications.length === 0 ? (
        <div className="alert alert-info">
          <i className="fas fa-inbox me-2"></i>
          No notifications found.
        </div>
      ) : (
        <>
          <div className="list-group">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`list-group-item list-group-item-action ${!notification.is_read ? 'bg-light border-start border-primary border-4' : ''}`}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      {getPriorityIcon(notification.priority)}
                      <h6 className={`mb-0 ${!notification.is_read ? 'fw-bold' : ''}`}>
                        {notification.title}
                      </h6>
                      <span className={`badge ${getTypeBadgeClass(notification.notification_type || notification.type)} ms-2`}>
                        {notification.notification_type || notification.type || 'General'}
                      </span>
                    </div>
                    <p className="mb-1 text-muted">{notification.message}</p>
                    <small className="text-muted">
                      <i className="fas fa-clock me-1"></i>
                      {getTimeAgo(notification.created_at)}
                    </small>
                  </div>
                  <div className="ms-3">
                    {!notification.is_read && (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleMarkRead(notification.id)}
                        title="Mark as read"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(pagination.previous || pagination.next) && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.previous ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p - 1)}>Previous</button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">Page {page} ({pagination.count} total)</span>
                </li>
                <li className={`page-item ${!pagination.next ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationList;
