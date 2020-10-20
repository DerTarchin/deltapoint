import React, { Component } from 'react';
import moment from 'moment';
import { p5map, getLatest, shouldUpdate } from '../utils';

require('./Volatility.css');

export default class Volatility extends Component {
  state = {
    bars: []
  };
  meta = {}

  componentDidMount = () => {
    this.calcData();
    if(this.refs.bars) {
      this.refs.bars.addEventListener('touchmove', e => e.stopPropagation(), { passive: false });
    }
  }

  shouldComponentUpdate = shouldUpdate.bind(this, this)

  componentDidUpdate = prevProps => {
    // check if data changed
    let dataChanged = false;
    if(prevProps.data !== this.props.data) dataChanged = true;
    if(prevProps.dataView !== this.props.dataView) dataChanged = true;
    if(prevProps.feeAdjustments !== this.props.feeAdjustments) dataChanged = true;
    if(prevProps.contributionAdjustments !== this.props.contributionAdjustments) dataChanged = true;
    if(dataChanged) this.calcData();
  }

  calcData = () => {
    const { history, activeDates } = this.props;
    const stop = moment(this.props.data.meta.start_date);
    const bars = [];

    // start with last trading day and work backwards, max 30 bars
    let date = getLatest(this.props.history, activeDates[1].clone()).date;
    let prev = date.isSame(stop) ? date : getLatest(this.props.history, date.clone().subtract(1, 'days')).date;
    while(bars.length < 30) {
      // account for when the date is too close to the start_date
      if(date.isSame(prev)) {
        bars.push({ range: 0 });
      } else {
        const datestr = date.format('L'), prevstr = prev.format('L');

        const prevClose = history[prevstr].adj.balance;
        let high = history[datestr].adj.cash_balance,
            low =  history[datestr].adj.cash_balance;

        // calc estimated high and low based on remaining open positions
        const { positions } = history[datestr];
        Object.keys(history[datestr].positions || {}).forEach(sym => {
          high += positions[sym].h * positions[sym].shares;
          low += positions[sym].l * positions[sym].shares;
        });

        // high and low compared to previous close
        high = Math.max(high, prevClose);
        low = Math.min(low, prevClose);

        bars.push({ range: high - low, date })
        date = prev.clone();
        if(prev.isAfter(stop)) {
          prev = getLatest(this.props.history, prev.subtract(1, 'days')).date;
        }
      }

    }

    this.setState({ bars });
  }

  render = () => {
    const { bars } = this.state;

    const max = bars.reduce((max, curr) => Math.max(max, curr.range), 0);

    return (
      <div className="tile-container" id="volatility">
        <div className="tile">
          <div className="header">
            <div className="title">Volatility</div>
          </div>
          <div className="body">
            <div className="bars hide-scroll" ref="bars">
              {
                bars.map((bar,i) => {
                  const height = p5map(bar.range, 0, max, 0, 100) || 0;
                  return <div className="bar" key={i} style={{ height: `${height}%` }} />
                })
              }
            </div>
          </div>
        </div>
      </div>
    )
  }
}