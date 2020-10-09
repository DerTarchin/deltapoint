import React, { Component } from 'react';
import anime from 'animejs';
import moment from 'moment';
import { 
  cap,
  glow,
  round,
  colorMap,
  formatMoney,
  getNumberProperties,
  getColorProperties,
  generateAggs,
  shouldUpdate,
} from '../utils';
import {
  thinsearch,
  arrow
} from '../utils/icons';

require('./History.css');

const PERC = val => val ? round(val, Math.abs(val) < 1 ? 2 : Math.abs(val) < 10 ? 1 : 0) : 0

export default class Breakdown extends Component {
  state = {
    search: '',
    filter: [],
    selectedSymbol: null,
    toggledYears: [],
  }
  meta = {
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
    if(prevProps.show !== this.props.show) {
      if(this.props.show) {
        setTimeout(e => this.refs.input.focus(), 50);
        setTimeout(this.setAggs, 300);
      } else {
        this.refs.input.value = '';
        setTimeout(e => {
          if(!this.props.show) this.setState({ search: '', selectedSymbol: null, toggledYears: [] });
        }, 350);
      }
    }

    // if search bar is used, auto-scroll the symbol selector to the highlighted symbol
    if(
      (prevState.search !== this.state.search && !this.state.selectedSymbol && this.state.search) ||
      (!this.state.search && this.state.selectedSymbol && !prevState.selectedSymbol)
    ) {
      const sym = this.state.selectedSymbol || this.props.history.meta.symbols_traded.find(s => s.startsWith(this.state.search));
      if(sym) {
        [...document.querySelectorAll('.history .stock-opts .active')].forEach(el => el.classList.remove('active'));
        const el = document.querySelector(`.history .stock-opts li[data-sym="${sym}"]`);
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
  }

  setAggs = () => {
    if(this.meta.aggs) return;
    this.meta.aggs = generateAggs(this.props);
  }

  render = () => {
    const { filter, search } = this.state;
    const typeMap = {
      buy: colorMap.tactical,
      sell: colorMap.other,
      fee: colorMap.rotation,
      // adj: colorMap.cash,
      adj: colorMap.aggressive,
      transfer: colorMap.aggressive,
      dividend: colorMap.conservative
    }

    const rows = this.meta.transactions.filter(t => {
      if(filter.length && !filter.includes(t.type)) return false;
      if(search) {
        if(this.props.history.meta.symbols_traded.find(s => s.startsWith(search)) && (t.symbol || '').startsWith(search)) return true;
        if(t.type.startsWith(search)) return true;
        return false;
      }
      return true;
    });

    const renderDetails = () => {
      const sym = this.state.selectedSymbol || (search && this.props.history.meta.symbols_traded.find(s => s.startsWith(search)));
      const stockOpts = <ul key="opts" className="stock-opts hide-scroll">
        {
          this.props.history.meta.symbols_traded.reverse().map(sym => {
            const selected = sym === this.state.selectedSymbol;
            return <li 
              key={sym} 
              data-sym={sym} 
              className={selected ? 'single active' : null} 
              onClick={e => {
                if(sym === this.state.selectedSymbol) return;
                if(this.refs.value) this.refs.input.value = '';
                this.setState({ selectedSymbol: sym, search: '', toggledYears: [] });
              }}
            >{sym.toUpperCase()}</li>
          })
        }
      </ul>

      if(sym) {
        const aggs = this.meta.aggs[sym];
        console.log(aggs);
        let title = <div className="sym">{sym.toUpperCase()}</div>;
        if(search && search !== sym) {
          title = <div className="sym">
            {search.toUpperCase()}<span>{sym.replace(search, '').toUpperCase()}</span>
          </div>
        }
        let small = '' + round(Math.abs(aggs.total_pl % 1) * 100);
        if(small.length === 1) small = '0' + small;
        return [
          <div className="details-content hide-scroll" key={sym}>
            { title }
            <div className="divider" />
            <div className="balance">
              <span>{getNumberProperties(Math.ceil(aggs.total_pl)).comma}</span>.<small>{small}</small>
              <div className={`percent percent-tag ${aggs.total_pl < 0 ? 'neg' : 'pos'}`}>
                { arrow }
                { PERC(aggs.total_pl_perc) }%
              </div>
            </div>
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
                            (yaggs.sell_trades || []).reverse().map((trade,i) => {
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
          stockOpts
        ]
      }

      return <div className="empty-details">
        <div className="message">Search for a stock<br />or select one below:</div>
        { stockOpts }
      </div>
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
            <div className="transactions">
              <div className="filters">
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
                      {type}
                    </div>
                  })
                }
              </div>
              {
                rows.reverse().map((t,i) => {
                  let text = t.text.toLowerCase();
                  this.props.history.meta.symbols_traded.forEach(sym => {
                    text = text.replace(sym, sym.toUpperCase())
                  })
                  return <div key={i} className="row" title={t.text}>
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
                        <p>{cap(t.type === 'adj' ? 'adjustment' : t.type)} {(['buy','sell'].includes(t.type) && t.symbol || '').toUpperCase()}</p>
                      </div>
                      <div className="meta">
                        <small>Amount</small>
                        <p>{formatMoney(Math.abs(t.amount), 2)}</p>
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
              <div className="footer">
                <b>{ getNumberProperties(rows.length).comma }</b> transaction{rows.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="details">
              { renderDetails() }
            </div>
          </div>
        </div>
      </div>
    )
  }
}