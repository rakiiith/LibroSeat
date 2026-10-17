// Camera targets and card artwork for each proposed floor layout.
// Coordinates are presentation targets for the concept model, not measured plans.
export const FLOOR_AREAS = [
  [
    { id: 'study-area-01', title: 'Study Area 01', icon: '▤', image: require('../../assets/library3d/study-front.jpg'), camera: [-11, 9, 8], target: [-5, 0.9, 0] },
    { id: 'study-area-02', title: 'Study Area 02', icon: '▥', image: require('../../assets/library3d/library-overview.jpg'), camera: [11, 9, 8], target: [5, 0.9, 0] },
    { id: 'study-area-03', title: 'Study Area 03', icon: '▦', image: require('../../assets/library3d/group-study.jpg'), camera: [0, 10, 3.8], target: [0, 0.9, -5.2] },
  ],
  [
    { id: 'study-area-01', title: 'Study Area 01', icon: '▤', image: require('../../assets/library3d/study-front.jpg'), camera: [-10, 8, 8], target: [-5, 0.9, 0] },
    { id: 'study-area-02', title: 'Study Area 02', icon: '▥', image: require('../../assets/library3d/library-overview.jpg'), camera: [0, 7, -11], target: [0, 1, -4.5] },
    { id: 'study-area-03', title: 'Study Area 03', icon: '▦', image: require('../../assets/library3d/group-study.jpg'), camera: [0, 8, 12], target: [0, 0.9, 5] },
  ],
  [
    { id: 'study-area-01', title: 'Study Area 01', icon: '▤', image: require('../../assets/library3d/group-study.jpg'), camera: [0, 10, 12], target: [0, 0.9, 0] },
    { id: 'study-area-02', title: 'Study Area 02', icon: '▥', image: require('../../assets/library3d/study-front.jpg'), camera: [-11, 8, 8], target: [-5.5, 1, 4.5] },
    { id: 'study-area-03', title: 'Study Area 03', icon: '▦', image: require('../../assets/library3d/library-overview.jpg'), camera: [11, 8, 8], target: [5.5, 1, 2] },
  ],
];

export const FLOOR_THEMES = [
  { accent: '#087cf0', accentSoft: 'rgba(8,124,240,0.22)' },
  { accent: '#739b82', accentSoft: 'rgba(115,155,130,0.24)' },
  { accent: '#d69a54', accentSoft: 'rgba(214,154,84,0.24)' },
];
