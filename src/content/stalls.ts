export interface StallDefinition {
  id: string;
  name: string;
  cuisine: string;
  color: string;
  lessonIndex?: number;
}

/** Clockwise from the entrance. Only stalls with a lessonIndex can be visited. */
export const STALLS: StallDefinition[] = [
  {
    id: 'nasi',
    name: 'Dapur Aisyah',
    cuisine: 'Nasi lemak',
    color: '#B7613A',
    lessonIndex: 2,
  },
  {
    id: 'noodles',
    name: 'Mei Mei Fishball Noodle',
    cuisine: 'Fishball noodles',
    color: '#38786C',
    lessonIndex: 1,
  },
  { id: 'korean', name: 'Seoul Shiok', cuisine: 'Korean', color: '#8C7A94' },
  {
    id: 'japanese',
    name: 'Don Say Bojio',
    cuisine: 'Japanese',
    color: '#6C8690',
  },
  {
    id: 'western',
    name: 'Steak It Easy',
    cuisine: 'Western',
    color: '#947B68',
  },
  {
    id: 'caifan',
    name: 'Rice to Meet You',
    cuisine: 'Cai fan',
    color: '#8B956C',
  },
  { id: 'indian', name: 'Prata of Gold', cuisine: 'Indian', color: '#B89450' },
  {
    id: 'drinks',
    name: 'Heng Heng Kopi',
    cuisine: 'Kopi & teh',
    color: '#C8443D',
    lessonIndex: 0,
  },
];

export const PLACEHOLDER_STALLS = STALLS.filter(
  (stall) => stall.lessonIndex === undefined,
);
