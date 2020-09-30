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
  }
  meta = {}

  componentWillMount = () => {
  }

  componentDidUpdate = prevProps => {
  }

  render = () => {
    return (
      <div className="history">
        hello world
      </div>
    )
  }
}