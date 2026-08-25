const fs = require('fs');

const DISTRICTS = [
  { id:'vellamunda', path:'M120 60 L255 30 L390 42 L375 150 L360 255 L215 275 L70 240 L60 145 Z' },
  { id:'chandragiri', path:'M390 42 L540 70 L690 58 L715 145 L700 235 L530 215 L360 255 L375 150 Z' },
  { id:'ottakkal', path:'M690 58 L820 45 L945 80 L975 170 L960 265 L830 250 L700 235 L715 145 Z' },
  { id:'karippodu', path:'M70 240 L215 275 L360 255 L350 370 L395 485 L250 440 L110 470 L40 355 Z' },
  { id:'nedumbara', path:'M360 255 L530 215 L700 235 L640 345 L675 455 L535 510 L395 485 L350 370 Z' },
  { id:'thodupara', path:'M700 235 L830 250 L960 265 L915 375 L930 480 L800 445 L675 455 L640 345 Z' },
  { id:'manalvayal', path:'M110 470 L250 440 L395 485 L445 590 L430 690 L300 700 L180 660 L135 575 Z' },
  { id:'kanjirode', path:'M395 485 L535 510 L675 455 L730 560 L700 665 L565 660 L430 690 L445 590 Z' },
  { id:'poovathur', path:'M675 455 L800 445 L930 480 L930 565 L895 640 L800 690 L700 665 L730 560 Z' }
];

function mapPoint(x, y) {
  // Map x: [0, 1000] -> Lng: [74.5, 76.5]
  // Map y: [0, 800] -> Lat: [12.5, 11.0]
  const lng = 74.5 + (x / 1000) * 2.0;
  const lat = 12.5 - (y / 800) * 1.5;
  return [lng, lat];
}

const features = DISTRICTS.map(d => {
  const coords = [];
  const parts = d.path.split(' ');
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('M') || parts[i].startsWith('L')) {
      const x = parseFloat(parts[i].substring(1));
      const y = parseFloat(parts[i+1]);
      coords.push(mapPoint(x, y));
      i++;
    } else if (parts[i] === 'Z') {
      coords.push(coords[0]);
    }
  }
  return {
    type: 'Feature',
    id: d.id,
    properties: { id: d.id },
    geometry: { type: 'Polygon', coordinates: [coords] }
  };
});

let out = `import { DEMO_AREAS } from './seed';

export const KANARA_GEOJSON = {
  type: 'FeatureCollection',
  features: DEMO_AREAS.map(area => {
    const f = ${JSON.stringify(features)}.find(x => x.id === area.id);
    return {
      ...f,
      properties: { ...area }
    };
  })
} as any;
`;

fs.writeFileSync('src/demo/geojson.ts', out);
console.log('GeoJSON written.');
