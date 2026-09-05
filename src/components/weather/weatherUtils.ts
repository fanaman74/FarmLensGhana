export const weatherLabel = (code: number) => {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Mist or fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorms';
  return 'Mixed conditions';
};

export const weatherIcon = (code: number) => code === 0 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 82 ? '🌧️' : '⛈️';

export const formatDay = (date: string, long = false) => new Intl.DateTimeFormat('en-GH', { weekday: long ? 'long' : 'short', timeZone: 'Africa/Accra' }).format(new Date(`${date}T12:00:00Z`));
