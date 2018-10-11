import React, { Component } from 'react';
import { 
  round, 
  getNumberProperties, 
  getColorProperties, 
  glow,
  colorMap,
  constrain,
} from '../utils';

require('./breakdown.css');

const RADIUS = 4.8, CIRC = 2 * Math.PI * RADIUS;
const VTS = ['mdy','ziv','svxy'];

export default class Breakdown extends Component {
  state = {}
  meta = {}

  componentWillMount = () => {
    window.addEventListener('resize', this.resizeGraphs);
  }

  componentDidUpdate = () => {
    this.resizeGraphs();
  }

  componentWillUnmount = () => {
    window.removeEventListener('resize', this.resizeGraphs);
  }

  resizeGraphs = () => {
    const { graphs, body, svg, graphspace, stats } = this.refs;

    // resize graph container
    const size = Math.min(body.clientHeight, body.clientWidth);
    graphs.style.width = size + 'px';
    graphspace.style.width = size + 'px';
    graphs.style.height = size + 'px';
    graphs.setAttribute('data-sized', true);

    // show/hide stats if there's space
    const statRect = stats.getBoundingClientRect();
    // if(statRect.left + statRect.width)
    // console.log(statRect.left, statRect.width);
    stats.style.opacity = 1;

    // set svg viewboxes and items
    svg.setAttribute('viewBox', `0 0 ${body.clientHeight} ${body.clientHeight}`);
    const baseRadius = body.clientHeight / 2 - 10; // for stroke and glow spacing
    [...svg.querySelectorAll('.color')].forEach(el => {
      const i = el.getAttribute('data-index');
      const r = constrain(baseRadius * (1 - (.15*i)), baseRadius - (18*i), baseRadius - (15*i));
      el.setAttribute('r', r);
      el.style.strokeDasharray = 2 * Math.PI * r;
      el.style.strokeDashoffset = parseFloat(el.style.strokeDasharray) * (1 - el.getAttribute('data-perc'));
    });
    [...svg.querySelectorAll('.track')].forEach((el, i) => {
      const r = constrain(baseRadius * (1 - (.15*i)), baseRadius - (18*i), baseRadius - (15*i));
      el.setAttribute('r', r);
    });
    VTS.forEach(pos => {
      const el = document.getElementById('mark-'+pos);
      el.setAttribute('viewBox', `0 0 ${body.clientHeight} ${body.clientHeight}`);
      const circle = el.querySelector('.mark');
      const i = circle.getAttribute('data-index');
      const r = constrain(baseRadius * (1 - (.15*i)), baseRadius - (18*i), baseRadius - (15*i));
      circle.setAttribute('r', r);
      circle.style.strokeDasharray = 2 * Math.PI * r;
      circle.style.strokeDashoffset = parseFloat(circle.style.strokeDasharray) * (.999999);
      el.style.transform = `rotate(${-90 + (360 * circle.getAttribute('data-perc'))}deg)`;
    });
  }

  render = () => {
    const { data, activeDates, dataView, mobile } = this.props;
    const latest = data[activeDates[1].format('L')];
    // console.log(latest)

    const positions = {
      mdy: {
        index: 0,
      },
      ziv: {
        index: 1,
      },
      svxy: {
        index: 2,
      },
      other: {
        syms: [],
        shares: [],
        avgs: [],
        dates: [],
        index: 4,
      },
      cash: {
        value: latest.cash_balance,
        index: 3,
      }
    }
    latest.active_investments.forEach(sym => {
      const { shares, avg, since } = latest.positions[sym],
            cost = shares * avg,
            useOther = !VTS.includes(sym),
            pos = positions[useOther ? 'other' : sym];
      if(useOther) {
        pos.shares.push(shares)
        pos.avgs.push(avg);
        pos.value = (pos.value || 0) + cost;
        pos.dates.push(since);
        pos.syms.push(sym);
      } else {
        pos.shares = shares
        pos.value = cost;
        pos.date = since;
      }
    })
    const total = Object.keys(positions).map(key => positions[key].value || 0).reduce((t,v) => t+v);
    Object.keys(positions).forEach(key => { positions[key].perc = (positions[key].value || 0) / total });

    return (
      <div className="tile-container" id="breakdown">
        <div className="tile">
          <div className="header">
            <div className="title">Positions</div>
          </div>
          <div className="body" ref="body">
            <div className="radial-graphs square" ref="graphs">
              <svg ref="svg">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                </defs>
                { Object.keys(positions).map((pos, i) => <circle key={i} className="track" cx="50%" cy="50%" />) }
                {
                  Object.keys(positions).map(pos => {
                    return <circle 
                      key={pos}
                      className="color"
                      data-index={positions[pos].index}
                      data-perc={Math.max(positions[pos].perc, .00001)}
                      style={{ stroke: colorMap[pos] }}
                      filter="url(#glow)"
                      cx="50%" 
                      cy="50%" 
                    />
                  })
                }
              </svg>
              {
                VTS.map(pos => {
                  const goal = pos === 'mdy' ? .4 : .3; // percent size of account
                  // TODO make more accurate based on prices
                  return <svg id={'mark-'+pos} key={pos}><circle 
                    className="mark"
                    data-index={positions[pos].index}
                    data-perc={goal}
                    style={{ stroke: goal > positions[pos].perc ? colorMap[pos] : null }}
                    cx="50%" 
                    cy="50%" 
                  /></svg>
                })
              }
            </div>
            <div className="space" ref="graphspace" />
            <div className="stats" ref="stats">
              {
                Object.keys(positions).sort((a,b) => positions[a].index - positions[b].index).map(pos => {
                  const active = positions[pos].perc > 0;
                  return <div className={`stat ${active ? 'active' : ''}`} key={pos}>
                    <div className="icon">
                      <div style={{
                        background: colorMap[pos], 
                        boxShadow: glow(getColorProperties(colorMap[pos]))
                      }} />
                    </div>
                    <div>
                      <div className="title">{pos}</div>
                    </div>
                  </div>
                })
              }
            </div>
          </div>
        </div>
      </div>
    )
  }
}