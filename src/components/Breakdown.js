import React, { Component } from 'react';
import moment from 'moment';
import { 
  round, 
  formatNumber,
  getNumberProperties, 
  getColorProperties, 
  makeDoubleDecimal,
  glow,
  colorMap,
  constrain,
} from '../utils';

require('./breakdown.css');

const RADIUS = 4.8, CIRC = 2 * Math.PI * RADIUS;
const VTS = ['mdy','ziv','svxy'];

export default class Breakdown extends Component {
  state = {
    display: 'all',
    key: null,
    holdKey: null,
    tradeDetails: {},
  }
  meta = {}

  componentWillMount = () => {
    window.addEventListener('resize', this.resizeGraphs);
    this.calcTradeDetails();
  }

  componentWillReceiveProps = props => {
    this.calcTradeDetails(props);
  }

  componentDidUpdate = () => {
    this.resizeGraphs();
  }

  componentWillUnmount = () => {
    window.removeEventListener('resize', this.resizeGraphs);
  }

  calcTradeDetails = (props = this.props) => {
    const { history, feeAdjustments } = props;
    const tradeDetails = {};
    history.meta.symbols_traded.forEach(sym => {
      let dets = {
        buys: 0, // total money spent
        sells: 0, // total money back
        trades: 0, // total completed trades
      }
      if(sym === 'mdy') dets.strat = 'VTS Tactical';
      if(sym === 'svxy') dets.strat = 'VTS Aggressive';
      if(sym === 'ziv') dets.strat = 'VTS Conservative';
      const day = moment(history.meta.start_date, 'L');
      let currShares = 0;
      while(day.isSameOrBefore(props.activeDates[1], 'days')) {
        const data = history[day.format('L')];
        if(!data || !data.transactions) {
          day.add(1, 'days');
          continue;
        }
        let adj = 0;
        if(feeAdjustments) {
          const coms = history.meta.commission.filter(c => moment(c[0], 'L').isSameOrBefore(day));
          adj = coms[coms.length-1][1];
        }
        const trans = data.transactions.find(t => t.symbol === sym);
        if(trans) {
          if(trans.type === 'buy') {
            if(!currShares) dets.trades++;
            currShares += trans.shares;
            dets.buys += Math.abs(trans.shares * trans.price) + adj;
          }
          if(trans.type === 'sell') {
            currShares -= trans.shares;
            dets.sells += Math.abs(trans.shares * trans.price) + adj;
          }
        }
        if(day.isSame(props.activeDates[1], 'days')) {
          if(data.active_investments.includes(sym)) {
            const currData = data.positions[sym];
            dets.sells += currData.shares * currData.c;
            dets = { ...dets, ...currData };
          }
          // calc totals
          dets.total_pl = round(dets.sells - dets.buys, 2);
          const perc = 100*(dets.sells - dets.buys)/dets.buys;
          dets.total_pl_perc = round(perc, perc > 100 ? 0 : 1);
        }
        tradeDetails[sym] = dets;
        day.add(1, 'days');
      }
    });
    this.setState({ tradeDetails });
  }

  resizeGraphs = () => {
    const { graphs, body, svg, graphspace, keys, details } = this.refs;
    const { display } = this.state;

    // resize graph container
    const size = Math.min(body.clientHeight, body.clientWidth);
    graphs.style.width = size + 'px';
    graphspace.style.width = size + 'px';
    graphs.style.height = size + 'px';
    graphs.setAttribute('data-sized', true);
    details.style.maxHeight = (body.clientHeight - 5) + 'px';

    if(body.clientWidth < size + keys.clientWidth) {
      if(display !== 'no-stats') this.setState({ display: 'no-stats' });
    } else if(body.clientWidth < body.clientHeight * 2) {
      if(display !== 'no-details') this.setState({ display: 'no-details' });
    } else {
      if(display !== 'all') this.setState({ display: 'all' });
    }

    // set svg viewboxes and items
    svg.setAttribute('viewBox', `0 0 ${body.clientHeight} ${body.clientHeight}`);
    const baseRadius = body.clientHeight / 2 - 10; // for stroke and glow spacing
    [...svg.querySelectorAll('.color')].forEach(el => {
      const i = el.getAttribute('data-index');
      const r = constrain(baseRadius * (1 - (.15*i)), baseRadius - (18*i), baseRadius - (15*i));
      el.setAttribute('r', Math.max(r,0));
      el.style.strokeDasharray = 2 * Math.PI * r;
      el.style.strokeDashoffset = parseFloat(el.style.strokeDasharray) * (1 - el.getAttribute('data-perc'));
    });
    [...svg.querySelectorAll('.track')].forEach((el, i) => {
      const r = constrain(baseRadius * (1 - (.15*i)), baseRadius - (18*i), baseRadius - (15*i));
      el.setAttribute('r', Math.max(r,0));
    });
    [...document.querySelectorAll('.mark')].forEach(crc => {
      const el = crc.parentNode;
      el.setAttribute('viewBox', `0 0 ${body.clientHeight} ${body.clientHeight}`);
      const circle = el.querySelector('.mark');
      const i = circle.getAttribute('data-index');
      const r = constrain(baseRadius * (1 - (.15*i)), baseRadius - (18*i), baseRadius - (15*i));
      circle.setAttribute('r', r);
      circle.style.strokeDasharray = 2 * Math.PI * r;
      circle.style.strokeDashoffset = parseFloat(circle.style.strokeDasharray) - .01;
      el.style.transform = `rotate(${-90 + (360 * circle.getAttribute('data-perc'))}deg)`;
    });
  }

  render = () => {
    const { data, activeDates, dataView, mobile } = this.props;
    const { holdKey, key } = this.state;
    const latest = data[activeDates[1].format('L')];

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

    const renderDetails = () => {
      if(!key) return null;
      if(key === 'cash') {
        return <div className="group">
          <div className="row">
            <div style={{width: '100%', textAlign: 'center'}}>
              <div className="label">Cash Balance</div>
              <div className="value">${getNumberProperties(latest.adj.cash_balance).comma}</div>
            </div>
          </div>
        </div>
      }
      const syms = key !== 'other' ? [key] : latest.active_investments.filter(s => !VTS.includes(s));
      const html = syms.map(sym => {
        const dets = this.state.tradeDetails[sym];
        return <div className="group" key={sym}>
          <div className="single strat">{ dets.strat || sym.toUpperCase() }</div>
          <div className="row">
            <div className="col">
              <div className="label">Total P/L</div>
              <div className="value">${makeDoubleDecimal(getNumberProperties(dets.total_pl)).comma}</div>
            </div>
            <div className="col">
              <div className="label">Total P/L %</div>
              <div className="value">{getNumberProperties(dets.total_pl_perc).comma}%</div>
            </div>
            <div className="col">
              <div className="label">Total Traded</div>
              <div className="value">${makeDoubleDecimal(getNumberProperties(round(dets.buys, 2))).comma}</div>
            </div>
          </div>
          {
            !dets.shares ? null :
            [
              <div className="single date" key="since">{dets.since}</div>,
              <div className="row" key="r1">
                <div className="col">
                  <div className="label">Shares</div>
                  <div className="value">{formatNumber(dets.shares,1)}</div>
                </div>
                <div className="col">
                  <div className="label">Avg</div>
                  <div className="value">${makeDoubleDecimal(getNumberProperties(round(dets.avg, 2))).comma}</div>
                </div>
                <div className="col">
                  <div className="label">Trade #</div>
                  <div className="value">{dets.trades}</div>
                </div>
              </div>,
              <div className="row" key="r2">
                <div className="col">
                  <div className="label">P/L Open</div>
                  <div className="value">${makeDoubleDecimal(getNumberProperties(round(dets.shares * dets.c - dets.shares * dets.avg, 2))).comma}</div>
                </div>
                <div className="col">
                  <div className="label">P/L Open %</div>
                  <div className="value">{getNumberProperties(round(100*(dets.shares * dets.c - dets.shares * dets.avg)/(dets.shares*dets.avg), 1)).comma}%</div>
                </div>
                <div className="col">
                  <div className="label">Trade Cost</div>
                  <div className="value">${makeDoubleDecimal(getNumberProperties(round(dets.shares * dets.avg, 2))).comma}</div>
                </div>
              </div>
            ]
          }
        </div>
      })
      return html;
    }

    return (
      <div className="tile-container" id="breakdown">
        <div className="tile">
          <div className="header">
            <div className="title">Positions</div>
          </div>
          <div className={`body ${this.state.display}`} ref="body">
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
                Object.keys(positions).map(pos => {
                  if(pos === 'cash') return null;
                  let goal = .24; // percent size of account
                  if(pos === 'mdy') goal = .32;
                  if(pos === 'other') {
                    goal = .2;
                    if(goal > positions[pos].perc) return null;
                  }
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
            <div className="stats-container">
              <div className="keys" ref="keys">
                {
                  Object.keys(positions).sort((a,b) => positions[a].index - positions[b].index).map(pos => {
                    const active = positions[pos].perc > 0;
                    return <div 
                      className={`key ${active ? 'active' : ''} ${holdKey === pos ? 'expanded' : ''}`} 
                      key={pos}
                      onClick={e => this.setState({ holdKey: pos === holdKey ? null : pos })}
                      onMouseEnter={e => this.setState({ key: pos })}
                      onMouseLeave={e => this.setState({ key: holdKey })}
                    >
                      <div className="icon">
                        <div style={{
                          background: colorMap[pos], 
                          boxShadow: glow(getColorProperties(colorMap[pos]))
                        }} />
                      </div>
                      <div className="title">
                        {pos}
                        {pos !== 'other' ? null : <span>{positions[pos].syms.length}</span>}
                      </div>
                    </div>
                  })
                }
              </div>
              <div className="details" ref="details"> {renderDetails()} </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}