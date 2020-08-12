import React, { Component } from 'react';
import anime from 'animejs';
import moment from 'moment';
import { 
  round, 
  getNumberProperties, 
  getColorProperties, 
  glow,
  colorMap,
  makeDoubleDecimal,
  formatMoney,
  getLatest
} from '../utils';
import { 
  threedot,
} from '../utils/icons';

require('./Balances.css');

export default class Balances extends Component {
  state = {};
  meta = {}

  componentWillReceiveProps = props => {
    // ANIMATE TRANSITIONS
    if(this.state.showData || this.props.mobile) return;
    const old = getLatest(this.props.data, this.props.activeDates[1]).data,
          latest = getLatest(props.data, props.activeDates[1]).data,
          perc = props.dataView === '%';
          
    let shouldAnimate = false;
    if(old.adj.balance !== latest.adj.balance) shouldAnimate = true;
    if(old.ytd_contributions !== latest.ytd_contributions) shouldAnimate = true;
    if(old.adj.pl !== latest.adj.pl) shouldAnimate = true;
    if(this.props.feeAdjustments !== props.feeAdjustments) shouldAnimate = true;
    if(this.props.contributionAdjustments !== props.contributionAdjustments) shouldAnimate = true;
    if(shouldAnimate) {
      const { balance, ytd, pl } = this.refs;
      const anim = {
        balance_from: getNumberProperties(balance.textContent.replace('$','')).value,
        ytd_from: getNumberProperties(ytd.textContent.replace(perc ? '%' : '$','')).value,
        pl_from: getNumberProperties(pl.textContent.replace(perc ? '%' : '$','')).value,
      }
      if(this.meta.valAnims) this.meta.valAnims.pause();
      this.meta.valAnims = anime({
        targets: anim, 
        balance_from: latest.adj.balance,
        ytd_from: perc ? round(100 * latest.ytd_contributions / this.getMaxContributions(props.activeDates[1]), 0) 
                  : latest.ytd_contributions,
        pl_from: perc ? latest.adj.plPerc : latest.adj.pl,
        easing: 'easeOutExpo',
        // round: 2,
        duration: 1000,
        update: () => {
          if(props.dataView !== this.props.dataView) return;
          if(anim.balance_from_history !== anim.balance_from) {
            const valEls = balance.querySelectorAll('[data-val]');
            const num = makeDoubleDecimal(getNumberProperties(round(anim.balance_from, 2)));
            num.comma.split('.').forEach((n, i) => { valEls[i].innerHTML = n});
          }
          if(anim.ytd_from_history !== anim.ytd_from) {
            const num = getNumberProperties(round(anim.ytd_from, 0));
            ytd.querySelector('[data-val]').innerHTML = num.comma;
          }
          if(anim.pl_from_history !== anim.pl_from) {
            if(perc) {
              let num = round(anim.pl_from, 2);
              if(Math.abs(latest.adj.plPerc) >= 1) num = round(num, 1);
              if(Math.abs(latest.adj.plPerc) >= 10) num = round(num, 0);
              pl.querySelector('[data-val]').innerHTML = num;
            } else {
              const num = makeDoubleDecimal(getNumberProperties(round(anim.pl_from, 2)));
              const valEls = pl.querySelectorAll('[data-val]');
              num.comma.split('.').forEach((n, i) => { valEls[i].innerHTML = n});
            }
          }
          anim.balance_from_history = anim.balance_from;
          anim.ytd_from_history = anim.ytd_from;
          anim.pl_from_history = anim.pl_from;
        }
      })
    }
  }

  getMaxContributions = date => {
    const list = this.props.data.meta.max_contribution;
    let pair, year = date.year();
    while(!pair) {
      for(let i = 0; i < list.length; i++) {
        if(list[i][0] === year) pair = list[i];
      }
      year--;
    }
    return pair[1];
  }

  render = () => {
    const { data, activeDates, dataView, mobile } = this.props;
    const { showData } = this.state;
    const perc = dataView === '%';
    const latest = getLatest(data, activeDates[1]).data,
          balance = getNumberProperties(round(latest.adj.balance, 2)),
          ytd = getNumberProperties(round(latest.ytd_contributions, 2)),
          max = getNumberProperties(round(this.getMaxContributions(activeDates[1]), 2)),
          ytdRange = 100 * ytd.value / max.value,
          ytdPerc = round(ytdRange, 0),
          total = getNumberProperties(round(latest.adj.total_contributions, 2)),
          pl = getNumberProperties(round(latest.adj.pl, 2)),
          plPerc = round(latest.adj.plPerc, 
                         Math.abs(latest.adj.plPerc) < 1 ? 2 :
                         Math.abs(latest.adj.plPerc) < 10 ? 1 : 0),
          plRange = 100 * Math.abs(pl.value) / (pl.value + total.value);
    [balance,pl].map(makeDoubleDecimal);
    let commIndex = data.meta.commission.length - 1,
        currComm = data.meta.commission[commIndex];
    while(moment(currComm[0],'L').isAfter(activeDates[1])) {
      commIndex--;
      currComm = data.meta.commission[commIndex];
    }

    const calcAge = () => {
      const start = moment(data.meta.start_date, 'L');
      const days = activeDates[1].diff(start, 'days'),
            months = Math.floor(days/30, 0),
            years = Math.floor(months/12, 0);
      console.log(start, days, months, years)
      if(days <= 31) return `${days} day${days !== 1 ? 's' : ''}`;
      if(months <= 12) return `${months} month${months !== 1 ? 's' : ''}`;
      let text = `${years} year${years !== 1 ? 's' : ''}`;
      if(years < 5 && months % 12 > 0) {
        text.replace('years','yr').replace('year','yr');
        text += `, ${months % 12} mo`;
      }
      return text;
    }

    return (
      <div className="tile-container" id="balances">
        <div 
          className={`tile ${showData ? 'show-data' : ''}`}
          onClick={mobile ? e => this.setState({showData: !showData}) : null}
        >
          {
            mobile ? null :
            <div className="data-toggle" onClick={e => this.setState({showData: !showData})}>{threedot}</div>
          }
          <div className="header">
            <div className="title">Balances</div>
          </div>
          <div className="body">
            <div className="main">
              <div className="balance" ref="balance">
                <span>
                  <span className="dsign">$</span>
                  <span data-val>{balance.comma.split('.')[0]}</span>
                </span>
                <small>.<span data-val>{balance.comma.split('.')[1]}</span></small>
              </div>
              <div className="stats">

                <div className="stat">
                  {
                    perc ? <div className="val" ref="ytd"><span data-val>{ytdPerc}</span><span className="psign">%</span></div>
                    : <div className="val" ref="ytd"><span className="dsign">$</span><span data-val>{ytd.comma}</span></div>
                  }
                  <div className="title">YTD Contributions</div>
                  <div className="range">
                    <div style={{
                      width: ytdRange + '%',
                      background: colorMap.rotation,
                      boxShadow: glow(getColorProperties(colorMap.rotation))
                    }} />
                  </div>
                  <div className="details">
                    {
                      perc ? <span><span className="dsign">$</span>{ytd.comma} of max</span>
                      : <span>{ytdPerc}<span className="psign">%</span>of max</span>
                    }
                    <span><span className="dsign">$</span>{max.comma}</span>
                  </div>
                </div>

                <div className="stat">
                  {
                    perc ? <div className="val" ref="pl"> <span data-val>{plPerc}</span><span className="psign">%</span> </div>
                    : <div className="val" ref="pl">
                      <span>
                        <span className="dsign">$</span>
                        <span data-val>{pl.comma.split('.')[0]}</span>
                      </span>
                      <small>.<span data-val>{pl.comma.split('.')[1]}</span></small>
                    </div>
                  }
                  
                  <div className="title">{mobile ? 'P/L' : 'Earnings'} vs Principle</div>
                  <div className="range">
                    <div style={{
                      width: plRange + '%',
                      background: pl.value < 0 ? colorMap.other : colorMap.conservative, // pink / blue
                      boxShadow: glow(getColorProperties(pl.value < 0 ? colorMap.other : colorMap.conservative))
                    }} />
                  </div>
                  <div className="details">
                    <span>
                      { perc ? <span className="dsign">$</span> : null }
                      { perc ? pl.comma.replace(mobile ? '' : '-','') : Math.abs(plPerc) }
                      { perc ? null : <span className="psign">%</span> }
                      { perc ? ' ' : null }{ mobile && perc ? null : plPerc >= 0 ? 'profit' : 'loss' }
                    </span>
                    <span><span className="dsign">$</span>{total.comma}</span>
                  </div>
                </div>

              </div>
            </div>
            <div className="data">

              <table>
                <tbody>
                  <tr className="label-row">
                    <td>Balance</td>
                    <td>YTD {mobile ? 'Contrib.' : 'Contributions'}</td>
                    <td>Total Fees</td>
                  </tr>
                  <tr className="data-row">
                    <td>${balance.comma}</td>
                    <td>${ytd.comma}</td>
                    <td>${formatMoney(latest.total_fees, 2)}</td>
                  </tr>

                  <tr className="label-row">
                    <td>P/L Open</td>
                    <td>Total {mobile ? 'Contrib.' : 'Contributions'}</td>
                    <td>Commission {mobile ? null : 'Rate'}</td>
                  </tr>
                  <tr className="data-row">
                    <td>${pl.comma}</td>
                    <td>${total.comma}</td>
                    <td>${currComm[1]}</td>
                  </tr>

                  <tr className="label-row">
                    <td>P/L Open %</td>
                    <td>Max {mobile ? 'Contrib.' : 'Contributions'}</td>
                    <td>Account Age</td>
                  </tr>
                  <tr className="data-row">
                    <td>{plPerc}%</td>
                    <td>${max.comma}</td>
                    <td>{calcAge()}</td>
                  </tr>
                </tbody>
              </table>

            </div>
          </div>
        </div>
      </div>
    )
  }
}