import React, { Component } from 'react';
import anime from 'animejs';
import moment from 'moment';
import { 
  cap,
  glow,
  round,
  p5map,
  colorMap,
  getLatest,
  formatMoney,
  shouldUpdate,
  generateAggs,
  getClosestParent,
  getColorProperties,
  getNumberProperties,
} from '../utils';
import {
  angle,
  thinsearch,
  arrow
} from '../utils/icons';

const DELAY = 350;

require('./History.css');

const PERC = val => val ? round(val, Math.abs(val) < 1 ? 2 : Math.abs(val) < 10 ? 1 : 0) : 0
const INITIAL_STATE = {
  search: '',
  filter: [],
  selectedSymbol: null,
  toggledYears: [],
  showAllTransactions: false,
  showSymbolList: false,
}

export default class History extends Component {
  state = INITIAL_STATE
  meta = {
    key: 0,
    transactions: [],
  }

  shouldComponentUpdate = shouldUpdate.bind(this, this)

  componentDidMount = () => {
    const { history } = this.props;
    const end = moment(history.meta.last_updated, 'L'),
          day = moment(history.meta.start_date, 'L');
    while(day.isSameOrBefore(end, 'days')) {
      const d = history[day.format('L')]
      if(d && d.transactions) {
        this.meta.transactions.push(...d.transactions);
      }
      day.add(1, 'days');
    }
  }

  componentDidUpdate = (prevProps, prevState) => {
    const { mobile } = this.props;

    // if popup was toggled to show or hide
    if(prevProps.show !== this.props.show) {
      if(this.props.show) { // OPEN
        if(this.refs.transactions) this.refs.transactions.scrollTop = 0;
        if(this.refs.filters) this.refs.filters.scrollLeft = 0;
        this.fadeInRows(300);
        if(!mobile) {
          setTimeout(e => this.refs.input.focus(), 50);
          window.addEventListener('keydown', this.handleKey);
        }
        setTimeout(e => {
          this.setAggs();
          this.fadeInSymbols();
        }, DELAY);
      } else { // CLOSE
        if(this.refs.input) {
          this.refs.input.blur();
          this.refs.input.value = '';
        }
        setTimeout(e => {
          if(!this.props.show) this.setState(INITIAL_STATE);
          this.meta.key++;
        }, 350);
        window.removeEventListener('keydown', this.handleKey);
      }
    }

    // if search bar is used, auto-scroll the symbol selector to the highlighted symbol
    if(
      (prevState.search !== this.state.search && !this.state.selectedSymbol && this.state.search) ||
      (!this.state.search && this.state.selectedSymbol && prevState.selectedSymbol !== this.state.selectedSymbol)
    ) {
      const sym = this.state.selectedSymbol || this.props.history.meta.symbols_traded.find(s => s.startsWith(this.state.search));
      if(sym) {
        [...document.querySelectorAll('.history .details .stock-opts .active')].forEach(el => el.classList.remove('active'));
        const el = document.querySelector(`.history .details .stock-opts li[data-sym="${sym}"]`);
        // scroll to el
        if(el) {
          el.classList.add('active');
          const elLeft = el.getBoundingClientRect().left,
                parentLeft = el.parentNode.getBoundingClientRect().left;
          if(this.meta.scrollTo) this.meta.scrollTo.pause();
          this.meta.scrollTo = anime({
            targets: el.parentNode, 
            scrollLeft: Math.max(el.parentNode.scrollLeft + elLeft - parentLeft - 40, 0),
            easing: 'easeOutExpo',
            duration: 350,
          })
        }
      }
    }

    // if re-showing transactions (in mobile)
    if(prevState.showSymbolList && !this.state.showSymbolList) this.fadeInRows();
    // if showing stock opts (in mobile)
    if(!prevState.showSymbolList && this.state.showSymbolList) this.fadeInSymbols();
    // if showing stock opts (in regular)
    if(!this.props.mobile && this.getSym(prevProps, prevState) && !this.getSym()) this.fadeInSymbols();
  }

  handleKey = e => {
    if(e.key === 'Escape') return;
    e.stopPropagation();
    if(this.refs.input) this.refs.input.focus();
  }

  setAggs = () => {
    if(this.meta.aggs) return;
    this.meta.aggs = generateAggs(this.props);
  }

  fadeInRows = delay => {
    if(!this.refs.transactions) return;
    // sequentially fade in first 15 rows
    const rows = [...this.refs.transactions.querySelectorAll('.row')];
    // animate in
    if(this.meta.rowsAnime) this.meta.rowsAnime.pause();
    this.meta.rowsAnime = anime.timeline().add({
      targets: rows,
      opacity: [0,1],
      easing: 'easeOutSine',
      duration: 500,
      delay: (el, i, l) => (delay || 0) + (i * 75),
      complete: anim => this.setState({ showAllTransactions: true })
    })
  }

  fadeInSymbols = () => {
    if(!this.refs.opts) return;
    const opts = [...this.refs.opts.querySelectorAll('li')];
    // animate in
    if(this.meta.optsAnime) this.meta.optsAnime.pause();
    this.meta.optsAnime = anime.timeline().add({
      targets: opts,
      scale: [0,1],
      easing: 'easeOutSine',
      duration: 250,
      delay: (el, i, l) => 100 + (i * 20),
    })
  }

  setSym = sym => {
    if(this.refs.input) this.refs.input.value = '';
    this.setState({ selectedSymbol: sym, search: '', toggledYears: [] });
  }

  getSym = (props=this.props, state=this.state) => {
    const { search, selectedSymbol } = state;
    return selectedSymbol || (search && props.history.meta.symbols_traded.find(s => s.startsWith(search)));
  }

  getXY = e => ({
    x: round(e.pageX || e.touches[0].clientX),
    y: round(e.pageY || e.touches[0].clientY)
  })

  moveWindowStart = e => {
    if(!e || (!e.pageY && !e.touches)) return;
    e.persist();
    const { x, y } = this.getXY(e);
    this.meta.drag = {
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      target: e.target,
      time: performance.now()
    }
  }

  moveWindow = e => {
    const { drag } = this.meta;
    if(!drag || !e || (!e.pageY && !e.touches)) return;
    e.persist();
    const { x, y } = this.getXY(e);
    if(x === drag.lastX && y === drag.lastY) return;

    // if initial move direction, determine what action to perform
    if(!drag.action) {
      if(this.getSym() && this.refs.details) {
        if(x > drag.startX && Math.abs(y - drag.startY) < 3) {
          drag.action = 'exit_sym';
          this.refs.details.style.transitionDuration = '0s';
        } else {
          delete this.meta.drag;
          return;
        };
      }
      else {
        delete this.meta.drag
        return;
      }
    }

    if(drag.action === 'exit_sym') {
      // calculate how much to move window
      drag.percDragged = p5map(x, drag.startX, window.screen.width + drag.startX, 0, 100);
      this.refs.details.style.left = drag.percDragged + '%';
    }

    drag.dirX = drag.lastX > x ? 'left' : 'right';
    drag.dirY = drag.lastY > y ? 'up' : 'down';
    drag.lastX = x;
    drag.lastY = y;
    drag.time = performance.now();
  }

  moveWindowEnd = e => {
    const { drag } = this.meta;
    if(!drag || !e || (!e.pageY && !e.touches)) return;
    // nothing happened
    if(drag.lastX === drag.startX && drag.lastY === drag.startY) return;

    const fast = performance.now() - this.meta.drag.time < 75;

    if(drag.action === 'exit_sym') {
      this.refs.details.style.left = '';
      this.refs.details.style.transitionDuration = '';
      if(drag.dirX === 'right' && (drag.percDragged > 40 || fast)) {
        this.refs.details.classList.remove('show');
        if(fast) this.refs.details.style.transitionDuration = '.15s';
        setTimeout(e => {
          this.setSym();
          if(!this.getSym()) this.refs.details.style.transitionDuration = '';
        }, fast ? 150 : 350)
      }
    }

    delete this.meta.drag;
    console.log(fast)
  }

  render = () => {
    const { filter, search } = this.state;
    const typeMap = {
      buy: colorMap.tactical,
      sell: colorMap.other,
      fee: colorMap.rotation,
      adj: colorMap.aggressive,
      transfer: colorMap.aggressive,
      dividend: colorMap.conservative
    }
    const sym = this.getSym();
    const latest = this.props.show ? getLatest(this.props.history) : {},
          lData = (latest.data || {}).positions || {};

    const renderFilters = () => {
      return <div className="filters hide-scroll" ref="filters">
        {
          Object.keys(typeMap).map(type => {
            return <div 
              key={type}
              className={`${filter.includes(type) ? 'active' : ''} pill`}
              style={{ 
                boxShadow: glow(getColorProperties(typeMap[type])),
                borderColor: typeMap[type],
                color: typeMap[type],
              }} 
              onClick={e => {
                if(filter.includes(type)) this.setState({ filter: filter.filter(f => f !== type) });
                else this.setState({ filter: [...filter, type ] });
              }}
            >
              { type === 'adj' ? 'adjustment' : type }
            </div>
          })
        }
      </div>
    }

    const renderStockOpts = () => {
      const sym = this.state.selectedSymbol || (search && this.props.history.meta.symbols_traded.find(s => s.startsWith(search)));
      return (
        <ul key={`opts-${this.meta.key}`} className="stock-opts hide-scroll" ref="opts">
          {
            this.props.history.meta.symbols_traded.sort((a,b) => a < b ? -1 : 1).map(sym => {
              const selected = sym === this.state.selectedSymbol;
              return <li 
                key={sym} 
                data-sym={sym} 
                className={`${selected ? 'single active' : ''} ${lData[sym] ? 'active-trade' : ''}`} 
                title={lData[sym] ? 'Actively traded' : null}
                onClick={e => this.setSym(!selected && sym)}
              >
                { sym.toUpperCase() }
                { lData[sym] && <div className="active-dot" /> }
              </li>
            })
          }
        </ul>
      )
    }

    const renderSymbolList = () => {
      return <div className="symbols-list">
        { renderStockOpts() }
      </div>
    }

    const renderTransactions = () => {
      if(this.state.showSymbolList) return renderSymbolList();

      let rows = this.meta.transactions.filter(t => {
        if(filter.length && !filter.includes(t.type)) return false;
        if(search) {
          if(this.props.history.meta.symbols_traded.find(s => s.startsWith(search)) && (t.symbol || '').startsWith(search)) return true;
          if(t.type.startsWith(search)) return true;
          return false;
        }
        return true;
      }).reverse();
      if(!this.state.showAllTransactions || !this.props.show) rows = rows.slice(0, 17);

      return <div className="transactions" ref="transactions">
        { renderFilters() }
        {
          rows.map((t,i) => {
            let text = t.text.toLowerCase();
            this.props.history.meta.symbols_traded.forEach(sym => {
              text = text.replace(sym, sym.toUpperCase())
            });
            return <div key={i} className={`row ${t.symbol ? 'clickable' : ''}`} title={t.text} onClick={t.symbol ? e => {
              if(t.symbol === this.state.selectedSymbol) return;
              this.setSym(t.symbol);
            } : null}>
              <div 
                className="banner" 
                style={{ 
                  background: typeMap[t.type], 
                  boxShadow: glow(getColorProperties(typeMap[t.type])) 
                }} 
              />
              <div className="row-content hide-scroll">
                <div className="meta">
                  <small title={t.date}>{moment(t.date).format('MMM D, YYYY')}</small>
                  <p>{cap(t.type === 'adj' ? 'adjustment' : t.type)} {((['buy','sell'].includes(t.type) && t.symbol) || '').toUpperCase()}</p>
                </div>
                <div className="meta">
                  <small>Amount</small>
                  <p>{formatMoney(t.type === 'adj' ? t.amount : Math.abs(t.amount), 2)}</p>
                </div>
                {
                  ['buy','sell'].includes(t.type) && [
                    <div className="meta" key="shares">
                      <small>Shares</small>
                      <p>{t.shares}</p>
                    </div>,
                    <div className="meta" key="price">
                      <small>Price</small>
                      <p>{formatMoney(t.price)}</p>
                    </div>,
                    <div className="meta" key="commission">
                      <small>Commission</small>
                      <p>{formatMoney(t.commission)}</p>
                    </div>
                  ]
                }
                {
                  t.reg_fee > 0 && <div className="meta">
                    <small>Regulatory Fee</small>
                    <p>{formatMoney(t.reg_fee)}</p>
                  </div>
                }
                {
                  ['adj','transfer','fee','dividend'].includes(t.type) && <div className="meta text">
                    <small>Description</small>
                    <p>{text}</p>
                  </div>
                }
              </div>
            </div>
          })
        }
        {
          this.state.showAllTransactions ? (
            <div className="footer">
              <b>{ getNumberProperties(rows.length).comma }</b> transaction{rows.length === 1 ? '' : 's'}
            </div>
          ) : (
            <div className="footer">Loading...</div>
          )
        }
      </div>
    }

    const renderDetails = () => {
      if(!sym && this.props.mobile) return null;
      if(!sym) return <div className="empty-details"> { renderStockOpts() } </div>;

      const aggs = this.meta.aggs[sym];
      const activeDot = <div className="active-dot" style={{ background: colorMap.conservative, boxShadow: glow(getColorProperties(colorMap.conservative)) }} title="Actively traded stock" />
      const clear = <div className="clear" onClick={e => this.setSym()}>{ angle }</div>
      let small = '' + round(Math.abs(aggs.total_pl % 1) * 100);
      if(small.length === 1) small = '0' + small;
      const balance = (
        <div key="balance" className="balance">
          <span>{getNumberProperties(Math.ceil(aggs.total_pl)).comma}</span>.<small>{small}</small>
          <div className={`percent percent-tag ${aggs.total_pl < 0 ? 'neg' : 'pos'}`}>
            { arrow }
            { PERC(aggs.total_pl_perc) }%
          </div>
        </div>
      )

      let title = <div className="sym"> 
        { sym.toUpperCase() }{ lData[sym] && activeDot } 
        { clear }
        { this.props.mobile && balance }
      </div>;
      if(search && search !== sym) {
        title = <div className="sym">
          { search.toUpperCase() }<span>{ sym.replace(search, '').toUpperCase() }</span>
          { lData[sym] && activeDot }
          { clear }
        </div>
      };

      let currPL = lData[sym] && formatMoney((lData[sym].c - lData[sym].avg) * lData[sym].shares), 
          currPLPerc = lData[sym] && PERC((lData[sym].c - lData[sym].avg) / lData[sym].avg * 100);
      return [
        <div className="details-content hide-scroll" key={sym}>
          { title }
          {
            !this.props.mobile && [
              <div key="div" className="divider" />,
              balance
            ]
          }
          {
            lData[sym] && aggs.current && 
            <div className="metrics active" style={{ borderColor: colorMap.conservative, boxShadow: glow(getColorProperties(colorMap.conservative)) }}>
              <div className="metric double">
                <div className="header">P/L</div>
                <div className="value">{currPL} <span className="mute">|</span> {currPLPerc}%</div>
              </div>
              <div className="metric double" title={`${aggs.current.days_in_trade} day${aggs.current.days_in_trade === 1 ? '' : 's'}`}>
                <div className="header">Since</div>
                <div className="value">{moment(aggs.current.since).format('MMM D, YYYY')}</div>
              </div>
              <div className="metric">
                <div className="header">Avg</div>
                <div className="value">{formatMoney(aggs.current.avg)}</div>
              </div>
              <div className="metric">
                <div className="header">Shares</div>
                <div className="value">{getNumberProperties(aggs.current.shares).comma}</div>
              </div>
              <div className="metric">
                <div className="header">Max Gain</div>
                <div className="value">{PERC(aggs.current.max_upside)}%</div>
              </div>
              <div className="metric">
                <div className="header">Max Loss</div>
                <div className="value">{PERC(aggs.current.max_drawdown)}%</div>
              </div>
              <div className="metric">
                <div className="header">Open</div>
                <div className="value">{formatMoney(aggs.current.o)}</div>
              </div>
              <div className="metric">
                <div className="header">High</div>
                <div className="value">{formatMoney(aggs.current.h)}</div>
              </div>
              <div className="metric">
                <div className="header">Low</div>
                <div className="value">{formatMoney(aggs.current.l)}</div>
              </div>
              <div className="metric">
                <div className="header">Close</div>
                <div className="value">{formatMoney(aggs.current.c)}</div>
              </div>
            </div>
          }
          <div className="divider" />
          <div className="metrics">
            <div className="metric">
              <div className="header">Avg P/L</div>
              <div className="value">{PERC(aggs.avg_pl_perc)}%</div>
            </div>
            <div className="metric">
              <div className="header">Max Upside</div>
              <div className="value">{PERC(aggs.max_upside)}%</div>
            </div>
            <div className="metric">
              <div className="header">Max Drawdown</div>
              <div className="value">{PERC(aggs.max_drawdown)}%</div>
            </div>
            <div className="metric">
              <div className="header">Dividends</div>
              <div className="value">{aggs.dividends ? formatMoney(aggs.dividends) : '-'}</div>
            </div>
            <div className="metric">
              <div className="header">Fees</div>
              <div className="value">{aggs.fees ? formatMoney(aggs.fees) : '-'}</div>
            </div>
            <div className="metric">
              <div className="header" title="Avg days holding this position">Avg Days in Trade</div>
              <div className="value">{getNumberProperties(round(aggs.avg_days_in_trade)).comma}</div>
            </div>
            <div className="metric">
              <div className="header" title="Total trades, every trade included">Trades</div>
              <div className="value">{getNumberProperties(aggs.trades).comma}</div>
            </div>
            <div className="metric">
              <div className="header" title="Total full trade cycles">Cycles</div>
              <div className="value">{getNumberProperties(aggs.cycles).comma}</div>
            </div>
            <div className="metric">
              <div className="header" title="Total days holding this position">Total Days in Trade</div>
              <div className="value">{getNumberProperties(aggs.days_in_trade).comma}</div>
            </div>
          </div>
          <div className="divider" />
          {
            Object.keys(aggs.years).sort((a,b) => b - a).map((year,i,total) => {
              const yaggs = aggs.years[year];
              const toggled = this.state.toggledYears.includes(year);
              return [
                <div className="year" key={year}>
                  <div 
                    className={`toggle ${yaggs.total_pl ? '' : 'disabled'}`} 
                    onClick={e => {
                      if(!yaggs.total_pl) return;
                      if(toggled) this.setState({ toggledYears: this.state.toggledYears.filter(y => y !== year) });
                      else this.setState({ toggledYears: [...this.state.toggledYears, year] });
                    }}
                  >
                    <h1>{ year }</h1> 
                    {
                      !yaggs.total_pl ? null :
                      <div>
                        <span>{formatMoney(yaggs.total_pl)}</span>
                        <div className={`percent percent-tag ${yaggs.total_pl < 0 ? 'neg' : 'pos'}`}>
                          { arrow }
                          { PERC(yaggs.total_pl_perc) }%
                        </div>
                      </div>
                    }
                  </div>
                  {
                    toggled && <div className="extended">
                      <div className="metrics">
                        <div className="metric">
                          <div className="header">Avg P/L</div>
                          <div className="value">{PERC(yaggs.avg_pl_perc)}%</div>
                        </div>
                        <div className="metric">
                          <div className="header">Max Upside</div>
                          <div className="value">{PERC(yaggs.max_upside)}%</div>
                        </div>
                        <div className="metric">
                          <div className="header">Max Drawdown</div>
                          <div className="value">{PERC(yaggs.max_drawdown)}%</div>
                        </div>
                        <div className="metric">
                          <div className="header">Dividends</div>
                          <div className="value">{yaggs.dividends ? formatMoney(yaggs.dividends) : '-'}</div>
                        </div>
                        <div className="metric">
                          <div className="header">Fees</div>
                          <div className="value">{yaggs.fees ? formatMoney(yaggs.fees) : '-'}</div>
                        </div>
                        <div className="metric">
                          <div className="header" title="Avg days holding this position">Avg Days in Trade</div>
                          <div className="value">{getNumberProperties(round(yaggs.avg_days_in_trade)).comma}</div>
                        </div>
                        <div className="metric">
                          <div className="header" title="Total trades, every trade included">Trades</div>
                          <div className="value">{getNumberProperties(yaggs.trades).comma}</div>
                        </div>
                        <div className="metric">
                          <div className="header" title="Total full trade cycles">Cycles</div>
                          <div className="value">{getNumberProperties(yaggs.cycles).comma}</div>
                        </div>
                        <div className="metric">
                          <div className="header" title="Total days holding this position">% Days in Trade</div>
                          <div className="value">{PERC(yaggs.perc_days_in_trade)}%</div>
                        </div>
                      </div>
                      <div key="trades" className="trades">
                        { 
                          lData[sym] && latest.date && (latest.date.year() + '') === year && (
                            <div key={i} className="trade">
                              <div>Current Position</div>
                              <div>
                                <span>{currPL}</span>
                                <div className={`percent percent-tag ${currPLPerc < 0 ? 'neg' : 'pos'}`}>
                                  { arrow }
                                  { currPLPerc }%
                                </div>
                              </div>
                            </div>
                          )
                        }
                        {
                          [...(yaggs.sell_trades || [])].reverse().map((trade,i) => {
                            return <div key={i} className="trade">
                              <div>{moment(trade[0].date).format('L')}</div>
                              <div>
                                <span>{formatMoney(trade[0].amount - trade[1] * trade[0].shares)}</span>
                                <div className={`percent percent-tag ${trade[2] < 0 ? 'neg' : 'pos'}`}>
                                  { arrow }
                                  { PERC(trade[2]) }%
                                </div>
                              </div>
                            </div>
                          })
                        }
                      </div>
                    </div>
                  }
                </div>,
                i !== total.length - 1 && <div key="div" className="divider" />
              ]
            })
          }
        </div>,
        renderStockOpts()
      ]
    }

    if(this.props.mobile) {
      return (
        <div 
          ref="bg" 
          className={`history mobile ${this.props.show ? 'show' : ''}`} 
          onClick={e => {
            if(e.target === this.refs.bg) return this.props.close()
          }}
        >
          <div 
            className="history-window"
            onTouchStart={this.moveWindowStart} 
            onTouchMove={this.moveWindow} 
            onTouchEnd={this.moveWindowEnd}
            onMouseDown={this.moveWindowStart}
            onMouseMove={this.moveWindow}
            onMouseUp={this.moveWindowEnd}
          >
            <div className="search" onClick={e => {
              if(getClosestParent(e.target, 'svg') || e.target.getAttribute('id') === 'times') {
                this.setState({ showSymbolList: !this.state.showSymbolList, showAllTransactions: false });
              }
            }}>
              { this.state.showSymbolList ? 'Stocks' : 'Transactions' }
              { this.state.showSymbolList ? <span id="times">+</span> : thinsearch }
            </div>
            <div className="content">
              { renderTransactions() }
            </div>
            <div className={`details ${sym ? 'show' : ''}`} ref="details">
              { renderDetails() }
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={`history ${this.props.show ? 'show' : ''}`} ref="bg" onClick={e => {
        if(e.target === this.refs.bg) return this.props.close()
      }}>
        <div className="history-window">
          <div className="search">
            <input 
              ref="input"
              onKeyDown={e => e.key !== 'Escape' && e.stopPropagation()}
              placeholder="Search History" 
              onChange={e => this.setState({ 
                search: e.target.value.toLowerCase(), 
                selectedSymbol: null,
                toggledYears: []
              })} 
            />
            { thinsearch }
          </div>
          <div className="content">
            { renderTransactions() }
            <div className={`details ${sym ? 'with-sym' : ''}`}>
              { renderDetails() }
            </div>
          </div>
        </div>
      </div>
    )
  }
}