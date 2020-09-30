import React, { Component } from 'react';
import moment from 'moment';
import { 
  round, 
  formatNumber,
  getNumberProperties, 
  getColorProperties, 
  glow,
  colorMap,
  constrain,
  getLatest,
  formatMoney,
  shouldUpdate,
} from '../utils';
import { 
  threedot,
} from '../utils/icons';

require('./Breakdown.css');

const VTS = {
  // 10% to free trades
  tactical: {
    tickers: [
      'mdy', 
      'mvv', // 2x MDY
      'ief', 
      'ust', // 2x IEF
      'gld'
    ],
    label: 'VTS Tactical',
    allocation: .27 // 30% of 90% of total
  },
  aggressive: {
    tickers: ['svxy','vixy'],
    label: 'VTS Aggressive',
    allocation: .18 // 20% of 90% of total
  },
  conservative: {
    tickers: [
      'ziv', // deprecated
      'spy', 
      'sso', // 2x SPY
      'spxl', // SVXY replacement
      'tlt', 
      'vxx',
    ],
    label: 'VTS Conservative',
    allocation: .18 // 20% of 90% of total
  },
  rotation: {
    tickers: [
      'vpu', 
      'vig', 
      'vglt'
    ],
    label: 'VTS Defensive Rotation',
    allocation: .27 // 30% of 90% of total
  }
}

export default class Breakdown extends Component {
  state = {
    key: null,
    showData: false,
    tradeDetails: {},
  }
  meta = {}

  componentWillMount = () => {
    window.addEventListener('resize', this.resizeGraphs);
    this.calcTradeDetails();
  }

  shouldComponentUpdate = p => shouldUpdate(p, this.props)

  componentDidMount = () => {
    this.resizeGraphs();
  }

  componentDidUpdate = prevProps => {
    if(prevProps !== this.props) this.calcTradeDetails();
    else this.resizeGraphs();
  }

  componentWillUnmount = () => {
    window.removeEventListener('resize', this.resizeGraphs);
  }

  getVTS = sym => {
    return Object.keys(VTS).find(key => VTS[key].tickers.includes(sym));
  }

  calcTradeDetails = () => {
    const { history, feeAdjustments } = this.props;
    const tradeDetails = {};
    history.meta.symbols_traded.forEach(sym => {
      const key = this.getVTS(sym) || sym;
      let dets = {
        buys: 0, // total money spent
        sells: 0, // total money back
        trades: 0, // total completed trades
        ...tradeDetails[key]
      }
      if(this.getVTS(sym)) dets.strat = VTS[this.getVTS(sym)].label
      const day = moment(history.meta.start_date, 'L');
      while(day.isSameOrBefore(this.props.activeDates[1], 'days')) {
        const data = history[day.format('L')];
        if(!data) {
          day.add(1, 'days');
          continue;
        }

        let adj = 0;
        if(feeAdjustments) {
          const coms = history.meta.commission.filter(c => moment(c[0], 'L').isSameOrBefore(day));
          adj = coms[coms.length-1][1];
        }

        if(data.transactions) {
          const transactions = data.transactions.filter(t => t.symbol === sym);
          for(let i = 0; i < transactions.length; i++) {
            const trans = transactions[i];
            if(trans.type === 'buy') {
              if((data.positions[sym] || {}).shares === trans.shares) dets.trades++;
              dets.buys += Math.abs(trans.shares * trans.price) + adj;
            }
            if(trans.type === 'sell') dets.sells += Math.abs(trans.shares * trans.price) + adj;
          }
        }
        
        if(day.isSame(this.props.activeDates[1], 'days')) {
          if(Object.keys(data.positions).includes(sym)) {
            const currData = data.positions[sym];
            dets.sells += currData.shares * currData.c;
            dets = { ...dets, ...currData };
          }
          // calc totals
          dets.total_pl = round(dets.sells - dets.buys, 2);
          const perc = 100*(dets.sells - dets.buys)/dets.buys;
          dets.total_pl_perc = round(perc, perc > 100 ? 0 : 1);
        }
        tradeDetails[key] = dets;
        day.add(1, 'days');
      }
    });
    this.setState({ tradeDetails });
  }

  resizeGraphs = () => {
    const { graphs, body, svg, graphspace, keys, details } = this.refs;
    const { display } = this.state;
    if(!body || !graphs) return;

    // resize graph container
    const size = this.props.mobile ? Math.min(body.clientWidth, body.clientHeight) : Math.min(graphspace.clientWidth, graphspace.clientHeight);
    graphs.style.width = size + 'px';
    graphs.style.height = size + 'px';
    graphs.setAttribute('data-sized', true);
    graphs.querySelectorAll('svg').forEach(el => el.setAttribute('viewBox', `0 0 ${size} ${size}`))

    // set svg viewboxes and items
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    const baseRadius = size / 2 - 10; // for stroke and glow spacing
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
      el.setAttribute('viewBox', `0 0 ${size} ${size}`);
      const circle = el.querySelector('.mark');
      const i = circle.getAttribute('data-index');
      const r = constrain(baseRadius * (1 - (.15*i)), baseRadius - (18*i), baseRadius - (15*i));
      circle.setAttribute('r', Math.max(r,0));
      circle.style.strokeDasharray = 2 * Math.PI * r;
      circle.style.strokeDashoffset = parseFloat(circle.style.strokeDasharray) - .01;
      el.style.transform = `rotate(${-90 + (360 * circle.getAttribute('data-perc'))}deg)`;
    });
  }

  render = () => {
    const { data, activeDates, mobile } = this.props;
    const { key, showData } = this.state;
    const latest = getLatest(data, activeDates[1]).data;

    const positions = {
      tactical: {
        index: 0,
        syms: []
      },
      conservative: {
        index: 1,
        syms: []
      },
      aggressive: {
        index: 2,
        syms: []
      },
      rotation: {
        index: 3,
        syms: []
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
        index: 100,
      }
    }
    Object.keys(latest.positions).forEach(sym => {
      const { shares, avg, since } = latest.positions[sym],
            cost = shares * avg,
            useOther = !this.getVTS(sym),
            pos = positions[this.getVTS(sym) || 'other'];
      if(useOther) {
        pos.shares.push(shares); // remove
        pos.avgs.push(avg); // remove
        pos.value = (pos.value || 0) + cost; // remove
        pos.dates.push(since); // remove 
        pos.syms.push(sym);
      } else {
        pos.shares = shares; // remove
        pos.value = cost; // remove
        pos.date = since; // remove
        pos.syms.push(sym);
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
              <div className="value">${formatMoney(latest.adj.cash_balance)}</div>
            </div>
          </div>
        </div>
      }
      const syms = key !== 'other' ? [key] : Object.keys(latest.positions).filter(s => !this.getVTS(s));
      const html = syms.map(sym => {
        const dets = this.state.tradeDetails[this.getVTS(sym) || sym];
        return <div className="group" key={sym}>
          <div className="single strat">{ dets.strat || sym.toUpperCase() }</div>
          <div className="row">
            <div className="col">
              <div className="label">Total P/L</div>
              <div className="value">${formatMoney(dets.total_pl)}</div>
            </div>
            <div className="col">
              <div className="label">Total P/L %</div>
              <div className="value">{getNumberProperties(dets.total_pl_perc).comma}%</div>
            </div>
            <div className="col">
              <div className="label">Total Traded</div>
              <div className="value">${formatMoney(round(dets.buys, 2))}</div>
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
                  <div className="value">${formatMoney(round(dets.avg, 2))}</div>
                </div>
                <div className="col">
                  <div className="label">Trade #</div>
                  <div className="value">{dets.trades}</div>
                </div>
              </div>,
              <div className="row" key="r2">
                <div className="col">
                  <div className="label">P/L Open</div>
                  <div className="value">${formatMoney(round(dets.shares * dets.c - dets.shares * dets.avg, 2))}</div>
                </div>
                <div className="col">
                  <div className="label">P/L Open %</div>
                  <div className="value">{getNumberProperties(round(100*(dets.shares * dets.c - dets.shares * dets.avg)/(dets.shares*dets.avg), 1)).comma}%</div>
                </div>
                <div className="col">
                  <div className="label">Trade Cost</div>
                  <div className="value">${formatMoney(round(dets.shares * dets.avg, 2))}</div>
                </div>
              </div>
            ]
          }
        </div>
      })
      return html;
    }

    const renderKeys = () => {
      if(mobile) return null;

      return <div className="stats-container main" >
        <div className="keys" ref="keys">
          {
            Object.keys(positions).sort((a,b) => positions[a].index - positions[b].index).map(pos => {
              const active = positions[pos].perc > 0;
              let val;
              if(pos === 'cash') val = `$${formatMoney(positions[pos].value)}`;
              else if(active) val = positions[pos].syms.join(', ');

              const renderKey = (text, sub) => {
                return <div 
                  data-type={pos}
                  className={`key ${active ? 'active' : ''}`} 
                  key={text}
                  onClick={e => this.setState({ key: pos === key ? null : pos, showData: true, slide: 0 })}
                >
                  <div className="icon" style={pos === 'cash' ? { visibility: 'hidden' } : null}>
                    <div style={{
                      background: colorMap[pos], 
                      boxShadow: glow(getColorProperties(colorMap[pos]))
                    }} />
                  </div>
                  <div className="title">
                    {pos}
                    <span>{sub}</span>
                  </div>
                </div>
              }
              return renderKey(pos, val);
            })
          }
        </div>
      </div>
    }

    const renderSlides = () => {
      return <div className="data">
        <div className="slides" style={{ transform: `translateX(${-100 * this.state.slide}%)`}}>
          <div className="slide">
            {
              Object.keys(latest.positions).map(key => {
                const pos = latest.positions[key];
                const pl = getNumberProperties(round((pos.c - pos.avg) * pos.shares, 2)).comma,
                      plPercVal = (pos.c - pos.avg) / pos.avg * 100,
                      plPerc = round(plPercVal,
                               Math.abs(plPercVal) < 1 ? 2 :
                               Math.abs(plPercVal) < 10 ? 1 : 0),
                      isNeg = plPercVal < 0;
                return <div className="position" key={key}>
                  <div className="sym">{key}</div>
                  <div>
                    <div className="pl" style={{ color: colorMap[isNeg ? 'other' : 'tactical']}}>${formatMoney(pl, 2)}</div>
                    <div className="perc" style={{ background: colorMap[isNeg ? 'other' : 'tactical']}}>{plPerc}%</div>
                  </div>
                </div>
              })
            }
          </div>
          <div className="slide">
            this slide will include details on each VTS strategy: historical performance, current positions and % allocation (planned vs actual).
          </div>
        </div>
      </div>
    }

    return (
      <div className="tile-container" id="breakdown">
        <div className={`tile ${showData ? 'show-data' : ''}`}>
          {
            mobile ? null :
            <div className="data-toggle" onClick={e => this.setState({showData: !showData})}>{showData ? <span>+</span> : threedot}</div>
          }
          <div className="header">
            <div className="title">Positions</div>
          </div>
          <div className="body" ref="body">
            <div className="space main" ref="graphspace" onClick={mobile ? e => this.setState({ showData: !showData, slide: 0 }) : null}>
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
                  { 
                    Object.keys(positions).filter(pos => pos !== 'cash').map(pos => (
                      <circle key={pos} className="track" cx="50%" cy="50%" />
                    )) 
                  }
                  {
                    Object.keys(positions).filter(pos => pos !== 'cash').map(pos => (
                      <circle 
                        key={pos}
                        className="color"
                        data-index={positions[pos].index}
                        data-perc={Math.max(positions[pos].perc, .00001)}
                        style={{ stroke: colorMap[pos] }}
                        filter="url(#glow)"
                        cx="50%" 
                        cy="50%" 
                      />
                    ))
                  }
                </svg>
                {
                  Object.keys(positions).filter(pos => pos !== 'cash').map(pos => {
                    if(pos === 'cash') return null;
                    let goal; // percent size of account
                    if(VTS[pos]) goal = VTS[pos].allocation;
                    else goal = 1 - Object.keys(VTS).reduce((t,v) => t + VTS[v].allocation, 0);

                    // TODO make more accurate based on prices
                    return <svg id={'mark-'+pos} key={pos}>
                      <circle 
                        className="mark"
                        data-index={positions[pos].index}
                        data-perc={goal}
                        style={{ stroke: goal > positions[pos].perc ? colorMap[pos] : null }}
                        cx="50%" 
                        cy="50%" 
                      />
                    </svg>
                  })
                }
              </div>
            </div>
            
            { renderKeys() }

            { renderSlides() }
          </div>
        </div>
      </div>
    )
  }
}