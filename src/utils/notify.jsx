import { useEffect } from 'react';
import { App } from 'antd';

/**
 * Lightweight toaster + confirm-dialog layer on top of Ant Design's App context.
 *
 * Ant Design v6 exposes message / modal / notification through `App.useApp()` so
 * they correctly inherit the active (light/dark) theme. We capture those instances
 * once via <NotificationBridge /> and re-expose them as plain functions that can be
 * called from anywhere (event handlers, async utils) — falling back to the native
 * browser dialogs if the bridge has not mounted yet.
 */

let messageApi = null;
let modalApi = null;
let notificationApi = null;

/** Mount once near the app root (inside antd's <App>) to wire up the static helpers. */
export const NotificationBridge = () => {
  const { message, modal, notification } = App.useApp();

  useEffect(() => {
    messageApi = message;
    modalApi = modal;
    notificationApi = notification;
  }, [message, modal, notification]);

  return null;
};

export const toast = {
  success: (content) => (messageApi ? messageApi.success(content) : window.alert(content)),
  error: (content) => (messageApi ? messageApi.error(content) : window.alert(content)),
  info: (content) => (messageApi ? messageApi.info(content) : window.alert(content)),
  warning: (content) => (messageApi ? messageApi.warning(content) : window.alert(content)),
  /** Returns a function that dismisses the loading toast. */
  loading: (content) => {
    if (messageApi) return messageApi.loading(content, 0);
    return () => {};
  },
};

export const notify = (config) => {
  if (notificationApi) notificationApi.open(config);
};

/**
 * Promise-friendly confirmation dialog.
 * @param {{title:string, content?:string, okText?:string, cancelText?:string, okType?:string, onOk?:Function}} opts
 */
export const confirmDialog = ({
  title,
  content,
  okText = 'Confirm',
  cancelText = 'Cancel',
  okType = 'primary',
  onOk,
}) => {
  if (modalApi) {
    modalApi.confirm({ title, content, okText, cancelText, okType, centered: true, onOk });
    return;
  }
  // Fallback before the bridge is ready.
  if (window.confirm(`${title}${content ? `\n\n${content}` : ''}`)) {
    onOk?.();
  }
};
