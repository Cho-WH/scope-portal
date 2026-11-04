import { stage, node, smooth, mix } from '../drawing';
import type { PreviewScene, SensorData } from '../types';
import { axes, board, dotColor, noteRows, noteX, report, reportChart, tabletFrame, trendColor } from './sensor-art';

export function createScene(host: HTMLElement, data: SensorData): PreviewScene {
  const svg = stage(host);
  svg.style.overflow = 'hidden';
  const camera = node('g', {}, svg);
  const device = node('g', {transform:'translate(414 240)'}, camera);
  device.innerHTML = board;
  const tablet = node('g', {transform:'translate(866 240)'}, camera);
  tablet.innerHTML = tabletFrame;
  const chart = node('g', {}, tablet);
  chart.innerHTML = axes;
  const [[x1,y1],[x2,y2]] = data.trend;
  const line = node('line', {x1,y1,x2,y2,stroke:trendColor,'stroke-width':2.2,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':'1 1'}, chart);
  const points = data.points.map(([cx,cy])=>node('circle',{cx,cy,r:4.7,fill:dotColor},chart));
  const notes = node('g', {}, tablet);
  notes.innerHTML = report;
  const rows = Array.from(notes.querySelectorAll('[data-row]'), row => Array.from(row.querySelectorAll('path')));
  const caret = node('path', {d:'M0 -6v12', stroke:dotColor, 'stroke-width':1.8}, notes);
  const firstSample = 2150, sampleInterval = 300, travel = 590;
  // The paired wavefronts travel in the gap only. Each burst lands on a sample.
  const bursts = [0, 2, 4].map(sample => {
    const front = node('g', {fill:'none', stroke:'#c2cafa', 'stroke-width':4,
      'stroke-linecap':'round', opacity:0}, camera);
    node('path', {d:'M-7 -15 Q5 0 -7 15', opacity:.55}, front);
    node('path', {d:'M4 -21 Q20 0 4 21'}, front);
    return {front, arrival:firstSample + sample * sampleInterval};
  });
  return {
    durationMs: data.durationMs,
    renderAt(t) {
      const reveal = smooth((t-540)/1020), zoom = smooth((t-3910)/880);
      const focus = mix(mix(414,640,reveal),866,zoom);
      const scale = mix(mix(2.55,1,reveal),1.78,zoom);
      camera.setAttribute('transform', `translate(680 240) scale(${scale}) translate(${-focus} -240)`);
      tablet.style.opacity = String(smooth((reveal-.12)/.88));
      device.style.opacity = String(1-zoom);
      chart.style.opacity = String(smooth((t-1500)/410));
      for (const {front, arrival} of bursts) {
        const phase = (t - arrival + travel) / travel;
        const progress = smooth(phase);
        front.setAttribute('transform', `translate(${mix(518,647,progress)} 240) scale(${mix(.65,1,progress)})`);
        front.setAttribute('opacity', String(.95 * smooth(phase/.17) * (1-smooth((phase-.88)/.2))));
      }
      points.forEach((p,i)=>{p.style.opacity=String(smooth((t-firstSample-i*sampleInterval)/145));});
      const draw = smooth((t-4790)/710);
      line.style.opacity = draw ? '1' : '0';
      line.setAttribute('stroke-dashoffset',String(1-draw));
      const layout = smooth((t-5770)/700);
      chart.setAttribute('transform', `translate(${reportChart.x*layout} 0) scale(${mix(1,reportChart.scale,layout)})`);
      const start = 6360, step = 400;
      const active = Math.min(rows.length-1, Math.max(0,Math.floor((t-start)/step)));
      rows.forEach((row,i) => {
        const {words,length,y} = noteRows[i];
        const typed = length * smooth((t-start-i*step)/(step-50));
        row.forEach((word,j) => {
          const ink = Math.min(1,Math.max(0,(typed-words[j].start)/words[j].width));
          word.style.opacity = ink ? '1' : '0';
          word.setAttribute('stroke-dashoffset', String(1-ink));
        });
        if (i===active) caret.setAttribute('transform',`translate(${noteX+typed+3} ${y})`);
      });
      caret.style.opacity = String(smooth((t-start+160)/140)*(1-smooth((t-7520)/170)));
    },
    dispose(){svg.remove();}
  };
}
