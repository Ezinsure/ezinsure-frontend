import type { DeviceInfo, LocationInfo, TrackingData } from '@/features/admin-motor-new-application/types';

export const getDeviceInfo = (): DeviceInfo => {
  const ua = navigator.userAgent;

  const getBrowserInfo = () => {
    const browsers = [
      { name: 'Chrome', regex: /Chrome\/([0-9.]+)/ },
      { name: 'Firefox', regex: /Firefox\/([0-9.]+)/ },
      { name: 'Safari', regex: /Safari\/([0-9.]+)/ },
      { name: 'Edge', regex: /Edge\/([0-9.]+)/ },
      { name: 'Opera', regex: /Opera\/([0-9.]+)/ },
    ];

    for (const browser of browsers) {
      const match = ua.match(browser.regex);
      if (match) {
        return { name: browser.name, version: match[1] };
      }
    }
    return { name: 'Unknown', version: 'Unknown' };
  };

  const getOperatingSystem = () => {
    const platform = navigator.platform.toLowerCase();

    if (platform.includes('win')) return 'Windows';
    if (platform.includes('mac')) return 'macOS';
    if (platform.includes('linux')) return 'Linux';
    if (platform.includes('iphone') || platform.includes('ipad') || platform.includes('ipod')) {
      return 'iOS';
    }
    if (platform.includes('android')) return 'Android';

    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Mac OS X') && !ua.includes('iPhone') && !ua.includes('iPad')) {
      return 'macOS';
    }
    if (ua.includes('Linux')) return 'Linux';

    return 'Unknown';
  };

  const browser = getBrowserInfo();

  return {
    userAgent: ua,
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
    devicePixelRatio: window.devicePixelRatio,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    browserName: browser.name,
    browserVersion: browser.version,
    operatingSystem: getOperatingSystem(),
  };
};

export const getLocationInfo = async (): Promise<LocationInfo> => {
  const locationInfo: LocationInfo = {};

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      });
    });
    locationInfo.latitude = position.coords.latitude;
    locationInfo.longitude = position.coords.longitude;
    locationInfo.accuracy = position.coords.accuracy;
    locationInfo.timestamp = position.timestamp;
  } catch (error) {
    locationInfo.error = error instanceof Error ? error.message : 'Location access denied';
  }

  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const ipData = await response.json();
      locationInfo.ipLocation = {
        country: ipData.country_name,
        region: ipData.region,
        city: ipData.city,
        timezone: ipData.timezone,
      };
    }
  } catch (error) {
    console.debug('IP location lookup failed:', error);
  }

  return locationInfo;
};

export const getSessionId = (): string => {
  const storageKey = 'ezinsure_session_id';
  let sessionId: string | null = null;

  try {
    sessionId = sessionStorage.getItem(storageKey);
  } catch (error) {
    console.log('Session storage access failed:', error);
  }

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      sessionStorage.setItem(storageKey, sessionId);
    } catch (error) {
      console.log('Session storage write failed:', error);
    }
  }

  return sessionId;
};

export const getTrackingData = async (): Promise<TrackingData> => {
  const [deviceInfo, locationInfo] = await Promise.all([
    Promise.resolve(getDeviceInfo()),
    getLocationInfo(),
  ]);

  return {
    deviceInfo,
    locationInfo,
    sessionId: getSessionId(),
    timestamp: Date.now(),
  };
};
