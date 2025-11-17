import { toast as sonnerToast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
}

export const useToast = () => {
  const toast = ({ title, description, variant = 'default', duration }: ToastProps) => {
    switch (variant) {
      case 'success':
        sonnerToast.success(title, {
          description,
          duration: duration || 4000,
        });
        break;
      case 'error':
        sonnerToast.error(title, {
          description,
          duration: duration || 5000,
        });
        break;
      case 'warning':
        sonnerToast.warning(title, {
          description,
          duration: duration || 4000,
        });
        break;
      default:
        sonnerToast(title, {
          description,
          duration: duration || 4000,
        });
    }
  };

  const dismiss = (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  };

  return { toast, dismiss };
};

// Predefined toast functions for common actions
export const useActionToast = () => {
  const { toast } = useToast();

  const success = (message: string, description?: string) => {
    toast({ title: message, description, variant: 'success' });
  };

  const error = (message: string, description?: string) => {
    toast({ title: message, description, variant: 'error' });
  };

  const warning = (message: string, description?: string) => {
    toast({ title: message, description, variant: 'warning' });
  };

  const info = (message: string, description?: string) => {
    toast({ title: message, description, variant: 'default' });
  };

  // CRUD operation toasts
  const created = (resource: string) => {
    toast({ title: `${resource} created successfully`, variant: 'success' });
  };

  const updated = (resource: string) => {
    toast({ title: `${resource} updated successfully`, variant: 'success' });
  };

  const deleted = (resource: string) => {
    toast({ title: `${resource} deleted successfully`, variant: 'success' });
  };

  const uploadStarted = (filename: string) => {
    toast({ title: 'Upload started', description: filename, variant: 'default' });
  };

  const uploadComplete = (filename: string) => {
    toast({ title: 'Upload complete', description: filename, variant: 'success' });
  };

  const uploadFailed = (filename: string) => {
    toast({ title: 'Upload failed', description: filename, variant: 'error' });
  };

  return {
    toast,
    success,
    error,
    warning,
    info,
    created,
    updated,
    deleted,
    uploadStarted,
    uploadComplete,
    uploadFailed,
  };
};