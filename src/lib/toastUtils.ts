import { toast } from 'react-simple-toasts';

const baseClasses = 'px-3 py-2 rounded-lg text-white font-medium';

export const toastSuccess = (message: string) =>
  toast(message, {
    className: `${baseClasses} bg-green-600`,
  });

export const toastError = (message: string) =>
  toast(message, {
    className: `${baseClasses} bg-red-600`,
  });

export const toastInfo = (message: string) =>
  toast(message, {
    className: `${baseClasses} bg-blue-600`,
  });

export const toastWarning = (message: string) =>
  toast(message, {
    className: `${baseClasses} bg-yellow-600 text-black`,
  });
