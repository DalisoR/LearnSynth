interface ServiceWorkerRegistrationOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
}

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function registerServiceWorker(
  options: ServiceWorkerRegistrationOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if ('serviceWorker' in navigator) {
      const publicUrl = new URL(
        import.meta.env.BASE_URL,
        window.location.href
      );

      if (publicUrl.origin !== window.location.origin) {
        console.warn(
          'Service Worker will not work if the app is served from a different origin'
        );
        reject(new Error('Invalid origin'));
        return;
      }

      window.addEventListener('load', () => {
        const swUrl = `${import.meta.env.BASE_URL}sw.js`;

        if (isLocalhost) {
          checkValidServiceWorker(swUrl, options, resolve, reject);
          navigator.serviceWorker.ready.then(() => {
            console.log(
              'This web app is being served cache-first by a service worker.'
            );
          });
        } else {
          registerValidServiceWorker(swUrl, options, resolve, reject);
        }
      });
    } else {
      console.warn('Service Worker not supported in this browser');
      reject(new Error('Service Worker not supported'));
    }
  });
}

function registerValidServiceWorker(
  swUrl: string,
  options: ServiceWorkerRegistrationOptions,
  resolve: (value: void | PromiseLike<void>) => void,
  reject: (reason?: any) => void
) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('Service Worker registered:', registration);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;

        if (!installingWorker) {
          console.log('Service Worker installing is null');
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log(
                'New content is available; please refresh.'
              );
              options.onNeedRefresh?.();
            } else {
              console.log('Content is cached for offline use.');
              options.onOfflineReady?.();
            }
          }
        };
      };

      options.onSuccess?.(registration);
      resolve();
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
      reject(error);
    });
}

function checkValidServiceWorker(
  swUrl: string,
  options: ServiceWorkerRegistrationOptions,
  resolve: (value: void | PromiseLike<void>) => void,
  reject: (reason?: any) => void
) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidServiceWorker(swUrl, options, resolve, reject);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
      resolve();
    });
}

export function unregisterServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Service Worker unregistration failed:', error.message);
      });
  }
}

export function updateServiceWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('serviceWorker' in navigator)) {
      reject(new Error('Service Worker not supported'));
      return;
    }

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) {
        reject(new Error('No service worker registration found'));
        return;
      }

      registration.update().then(() => {
        console.log('Service Worker updated');
        resolve();
      }).catch((error) => {
        console.error('Service Worker update failed:', error);
        reject(error);
      });
    });
  });
}
