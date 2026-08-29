// One stroked icon alphabet for the whole app. Emoji stay only as the food
// thumbnail fallback — see DESIGN.md.

export type IconName =
  | 'home' | 'user' | 'plus' | 'minus' | 'left' | 'right' | 'close' | 'check'
  | 'camera' | 'image' | 'search' | 'barcode' | 'refresh' | 'trash' | 'grip'
  | 'flame' | 'activity' | 'droplet' | 'spark' | 'logout' | 'scale' | 'edit'
  | 'cloud' | 'lock' | 'chart' | 'alert' | 'down';

const PATHS: Record<IconName, string> = {
  home: 'M3 11.2 12 4l9 7.2M5.6 9.6V19a1 1 0 0 0 1 1h10.8a1 1 0 0 0 1-1V9.6',
  user: 'M20 20.5v-1.7a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1.7M12 11.3a3.6 3.6 0 1 0 0-7.3 3.6 3.6 0 0 0 0 7.3Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  left: 'm14.5 18-6-6 6-6',
  right: 'm9.5 18 6-6-6-6',
  close: 'M18 6 6 18M6 6l12 12',
  check: 'm4.5 12.5 5 5L19.5 7',
  camera: 'M3 8.6A1.6 1.6 0 0 1 4.6 7h2.2l1.4-2.2h7.6L17.2 7h2.2A1.6 1.6 0 0 1 21 8.6v9.8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 18.4ZM12 16.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z',
  image: 'M3.5 5.5h17v13h-17zM3.5 15l4.5-4 4 3.5 3.5-3 5 4.5M8.6 10a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z',
  search: 'M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM20.5 20.5l-4.2-4.2',
  barcode: 'M3.5 6v12M7 6v12M10.5 6v8M14 6v12M17.5 6v8M21 6v12',
  refresh: 'M20.5 4.5v5h-5M3.5 19.5v-5h5M4.2 10a8 8 0 0 1 13.3-3.3l3 2.8M19.8 14a8 8 0 0 1-13.3 3.3l-3-2.8',
  trash: 'M4 6.5h16M9.5 6.5V4.2h5v2.3M6.5 6.5 7.4 20a.8.8 0 0 0 .8.8h7.6a.8.8 0 0 0 .8-.8l.9-13.5',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  flame: 'M12 21c3.6 0 6-2.4 6-5.6 0-3.7-3.4-5.5-4-9.4-2 1.2-3.2 3-3.2 4.8 0 1-.6 1.7-1.3 1.7-.6 0-1.1-.5-1.3-1.3C7 12.6 6 14 6 15.4 6 18.6 8.4 21 12 21Z',
  activity: 'M3 12h4l2.5-6.5L14 18.5 16.5 12H21',
  droplet: 'M12 3.5c3.4 3.6 6 6.6 6 9.6a6 6 0 0 1-12 0c0-3 2.6-6 6-9.6Z',
  spark: 'M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13l-5.6-2 5.6-2ZM18.5 4v3.5M20.2 5.7h-3.4',
  logout: 'M9.5 20.5H5.6a1.6 1.6 0 0 1-1.6-1.6V5.1a1.6 1.6 0 0 1 1.6-1.6h3.9M16 16.5l4.5-4.5L16 7.5M20.5 12H9.5',
  scale: 'M4.5 20.5h15V7.5h-15zM8 7.5V5a4 4 0 0 1 8 0v2.5M12 11v5M9.5 13.5h5',
  edit: 'M4 20h4.2L19 9.2a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8Z',
  cloud: 'M7 19.5a4 4 0 0 1-.4-8A6 6 0 0 1 18 10.2a4.2 4.2 0 0 1-.6 9.3Z',
  lock: 'M6.5 10.5h11v10h-11zM8.8 10.5V7.6a3.2 3.2 0 0 1 6.4 0v2.9',
  chart: 'M4 19.5V13M9.3 19.5V7.5M14.7 19.5v-8M20 19.5V4.5',
  alert: 'M12 4 2.5 20.5h19zM12 10v4.2M12 17.4h.01',
  down: 'm6 9.5 6 6 6-6',
};

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  fill?: boolean;
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.75, fill = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} fill={fill ? 'currentColor' : 'none'} fillOpacity={fill ? 0.18 : undefined} />
    </svg>
  );
}
