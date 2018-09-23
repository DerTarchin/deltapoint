import React, { Component } from 'react';
import moment from 'moment';
import { round } from '../utils';

require('./balances.css');

export default class Balances extends Component {
  state = {};
  meta = {}

  componentDidMount = () => {
    // console.log(this.props)
  }

  toggle = () => {}

  render = () => {
    const { data, activeDates } = this.props;
    const latest = data[activeDates[1].format('L')];

    return (
      <div className="tile-container" id="balances">
        <div className="tile">
          BALANCES<br/><br/>
          { latest ? `$${round(latest.balance, 2)}` : 'no data' } 
        </div>
      </div>
    )
  }
}