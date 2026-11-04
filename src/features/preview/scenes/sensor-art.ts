import type { Point } from '../types';

// Tablet-local coordinates are shared by the animated shot and its end-frame poster.
export const tabletFrame = '<rect x="-205" y="-119" width="410" height="238" rx="20" fill="#272a33" stroke="#a1a7bb" stroke-width="2.5"/><rect x="-194" y="-108" width="388" height="216" rx="12" fill="#303441"/><circle cx="-200" cy="0" r="1.7" fill="#858da8"/>';
export const axes = '<path d="M-151 -77V76H158" fill="none" stroke="#9099b0" stroke-width="1.7" stroke-linecap="round"/>';
export const dotColor = '#d6dcff';
export const trendColor = '#a4ade5';
export const endTransform = 'translate(680 240) scale(1.78)';
export const reportChart = { x: -81, scale: .57 };
// Short groups suggest words typed directly on the tablet's existing surface.
export const noteX = 38;
export const noteRows = [[26,19,36,15], [18,36,28], [30,19]].map((widths,i) => {
  let offset = 0;
  const words = widths.map(width => {
    const start = offset;
    offset += width + 6;
    return {start,width};
  });
  return {y:-20+i*20, words, length:offset-6};
});
export const report = noteRows.map(({y,words}) => `<g data-row="">${words.map(({start,width}) =>
  `<path d="M${noteX+start} ${y}h${width}" stroke="#bfc5da" stroke-width="2.6" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/>`).join('')}</g>`).join('');
export function sensorPoster(points: Point[], trend: Point[]) {
  const [[x1,y1],[x2,y2]] = trend;
  return `<g transform="${endTransform}">${tabletFrame}<g transform="translate(${reportChart.x} 0) scale(${reportChart.scale})">${axes}<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${trendColor}" stroke-width="2.2" stroke-linecap="round"/>${points.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="4.7" fill="${dotColor}"/>`).join('')}</g>${report}</g>`;
}

// A front view: LED matrix, two pushbuttons, USB socket and five edge contacts.
export const board = `<rect x="-17" y="-74" width="34" height="12" rx="3" fill="#848b99"/>
  <rect x="-93" y="-66" width="186" height="132" rx="12" fill="#282c36" stroke="#adb3c6" stroke-width="2"/>
  <path d="M-92 41H92V54Q92 65 81 65H-81Q-92 65 -92 54Z" fill="#c7ac77"/>
  ${[-74,-37,0,37,74].map(x=>`<circle cx="${x}" cy="53" r="6" fill="#30333d"/>`).join('')}
  ${[-59,59].map(x=>`<rect x="${x-10}" y="-20" width="20" height="20" rx="3" fill="#626976"/><circle cx="${x}" cy="-10" r="7" fill="#22252e" stroke="#9ba1af"/>`).join('')}
  ${Array.from({length:25},(_,i)=>`<rect x="${i%5*11-24}" y="${Math.floor(i/5)*10-35}" width="5" height="6" rx="1" fill="${[7,11,12,13,17].includes(i)?'#cca095':'#555463'}"/>`).join('')}`;
