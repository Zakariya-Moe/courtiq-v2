export type TeamMeta = { name: string; city: string; primary: string; secondary: string };

export const TEAM_META: Record<string, TeamMeta> = {
  ATL: { name: 'Hawks',         city: 'Atlanta',        primary: '#C1272D', secondary: '#FDB927' },
  BOS: { name: 'Celtics',       city: 'Boston',         primary: '#007A33', secondary: '#BA9653' },
  BKN: { name: 'Nets',          city: 'Brooklyn',       primary: '#1D1D1D', secondary: '#FFFFFF' },
  CHA: { name: 'Hornets',       city: 'Charlotte',      primary: '#1D1160', secondary: '#00788C' },
  CHI: { name: 'Bulls',         city: 'Chicago',        primary: '#CE1141', secondary: '#000000' },
  CLE: { name: 'Cavaliers',     city: 'Cleveland',      primary: '#860038', secondary: '#FDBB30' },
  DAL: { name: 'Mavericks',     city: 'Dallas',         primary: '#00538C', secondary: '#002B5E' },
  DEN: { name: 'Nuggets',       city: 'Denver',         primary: '#0E2240', secondary: '#FEC524' },
  DET: { name: 'Pistons',       city: 'Detroit',        primary: '#C8102E', secondary: '#1D42BA' },
  GSW: { name: 'Warriors',      city: 'Golden State',   primary: '#1D428A', secondary: '#FFC72C' },
  HOU: { name: 'Rockets',       city: 'Houston',        primary: '#CE1141', secondary: '#000000' },
  IND: { name: 'Pacers',        city: 'Indiana',        primary: '#002D62', secondary: '#FDBB30' },
  LAC: { name: 'Clippers',      city: 'LA',             primary: '#C8102E', secondary: '#1D428A' },
  LAL: { name: 'Lakers',        city: 'Los Angeles',    primary: '#552583', secondary: '#FDB927' },
  MEM: { name: 'Grizzlies',     city: 'Memphis',        primary: '#5D76A9', secondary: '#12173F' },
  MIA: { name: 'Heat',          city: 'Miami',          primary: '#98002E', secondary: '#F9A01B' },
  MIL: { name: 'Bucks',         city: 'Milwaukee',      primary: '#00471B', secondary: '#EEE1C6' },
  MIN: { name: 'Timberwolves',  city: 'Minnesota',      primary: '#0C2340', secondary: '#236192' },
  NOP: { name: 'Pelicans',      city: 'New Orleans',    primary: '#0C2340', secondary: '#C8102E' },
  NYK: { name: 'Knicks',        city: 'New York',       primary: '#006BB6', secondary: '#F58426' },
  OKC: { name: 'Thunder',       city: 'Oklahoma City',  primary: '#007AC1', secondary: '#EF3B24' },
  ORL: { name: 'Magic',         city: 'Orlando',        primary: '#0077C0', secondary: '#C4CED4' },
  PHI: { name: '76ers',         city: 'Philadelphia',   primary: '#006BB6', secondary: '#ED174C' },
  PHX: { name: 'Suns',          city: 'Phoenix',        primary: '#1D1160', secondary: '#E56020' },
  POR: { name: 'Trail Blazers', city: 'Portland',       primary: '#E03A3E', secondary: '#000000' },
  SAC: { name: 'Kings',         city: 'Sacramento',     primary: '#5A2D81', secondary: '#63727A' },
  SAS: { name: 'Spurs',         city: 'San Antonio',    primary: '#8A9EA8', secondary: '#000000' },
  TOR: { name: 'Raptors',       city: 'Toronto',        primary: '#CE1141', secondary: '#000000' },
  UTA: { name: 'Jazz',          city: 'Utah',           primary: '#002B5C', secondary: '#00471B' },
  WAS: { name: 'Wizards',       city: 'Washington',     primary: '#002B5C', secondary: '#E31837' },
};

export const getTeam = (abbr: string): TeamMeta =>
  TEAM_META[abbr] ?? { name: abbr, city: '', primary: '#1a1a1a', secondary: '#333' };

export const calcTS = (pts: number, fga: number, fta: number): number => {
  const d = 2 * (fga + 0.44 * fta);
  return d === 0 ? 0 : Math.round((pts / d) * 1000) / 10;
};

export const calcEFG = (fgm: number, fg3m: number, fga: number): number =>
  fga === 0 ? 0 : Math.round(((fgm + 0.5 * fg3m) / fga) * 1000) / 10;

export const fmtMin = (raw: string): string => {
  if (!raw) return '0:00';
  const [m, s] = raw.split(':');
  return `${parseInt(m)}:${(s || '00').padStart(2, '0')}`;
};
