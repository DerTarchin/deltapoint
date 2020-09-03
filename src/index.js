import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { ContentEditable } from './components';
import Interface from './Interface'
import InterfaceMobile from './InterfaceMobile'
import { decrypt } from './utils';
import anime from 'animejs';
import moment from 'moment';
import { rotatephone } from './utils/icons';

require('./App.css');

const MOBILE_DEV = false;

const REQUEST = require('request');
const DATA_URL = 'https://raw.githubusercontent.com/DerTarchin/misc/master/.dpd';
const IS_ENTER = e => (e.key || e.keyCode) === 'Enter' || e.which === 13;

const LOGIN_ANIM_DURATION = 1000;

const NOW = moment();
const DATE_OPTS = [
  { // 1 month
    range_count: '1',
    range_type: 'M',
    start: NOW.clone().subtract(1, 'months'),
    end: NOW,
  },
  { // 3 months
    range_count: '3',
    range_type: 'M',
    start: NOW.clone().subtract(3, 'months'),
    end: NOW,
  },
  // { // 6 months
  //   range_count: '6',
  //   range_type: 'M',
  //   start: NOW.clone().subtract(6, 'months'),
  //   end: NOW,
  // },
  { // 1 year
    range_count: '1',
    range_type: 'Y',
    start: NOW.clone().subtract(12, 'months'),
    end: NOW,
  },
  { // all time
    range_count: 'ALL',
    range_type: '',
    start: moment('2000-1-1'),
    end: NOW,
  },
];

class App extends Component {
  state = {
    // app init
    data: null,
    encrypted: true,
    unlockError: '',
    showUnlock: true,

    // app settings
    lastDay: NOW,
    activeDateOpt: 0,
    activeDates: [DATE_OPTS[0].start, DATE_OPTS[0].end],
    feeAdjustments: true,
    contributionAdjustments: false,
    dataView: '%',
  }
  meta = {}

  componentWillMount = () => {
    // disable overscroll on mobile
    document.addEventListener('touchmove', e => e.preventDefault(), false);
    window.addEventListener('orientationchange', () => this.setState({ mobileOrientation: window.orientation }), false);
  }

  componentDidMount = () => {
    // retrieve encrypted data
    if(DATA_URL) REQUEST(DATA_URL, (error, response, body) => {
      if(error || !body) alert(error);
      this.meta.encryptedMsg = JSON.parse(body).encryptedMsg;
      // dev
      setTimeout(() => this.unlock('dpdev'), 500);
    });

    // ===
    if(this.state.encrypted) {
      // activate anime.js for unlock dialog
      this.meta.loginAnime = anime({
        targets: this.refs.unlock,
        opacity: [0,1],
        easing: 'easeInQuad',
        duration: LOGIN_ANIM_DURATION,
      });
      this.refs.unlockInput.focus();
    }
  }

  unlock = passphrase => {
    if(!passphrase || !this.state.encrypted) return this.refs.unlockInput.focus();
    if(!this.meta.encryptedMsg) {
      this.refs.unlockInput.focus();
      this.setState({ unlockError: 'Unable to retrieve data.'})
      return;
    }
    const data = decrypt(this.meta.encryptedMsg, passphrase);
    if(!data) {
      this.refs.unlockInput.clearContent();
      this.refs.unlockInput.focus();
      this.setState({ unlockError: 'Incorrect passphrase.'})
      return;
    }
    // console.log(data, data.dertarchinroth)

    // parse data
    const accounts = Object.keys(data),
          activeAccount = accounts[0];
    this.meta.decryptedMsg = data;
    this.meta.acctData = data[activeAccount];
    const { acctData } = this.meta;
    
    // reset date ranges
    const lastDay = moment(acctData.meta.last_updated, 'L');
    while((!lastDay.day() || lastDay.day() === 6) || !acctData[lastDay.format('L')]) {
      lastDay.subtract(1, 'days');
    }
    const startDate = moment(acctData.meta.start_date, 'L');
    DATE_OPTS[0].start = lastDay.clone().subtract(1,'months');
    DATE_OPTS[1].start = lastDay.clone().subtract(3,'months');
    // DATE_OPTS[2].start = lastDay.clone().subtract(6,'months');
    DATE_OPTS[2].start = lastDay.clone().subtract(1,'years');
    DATE_OPTS[3].start = startDate;
    DATE_OPTS.forEach(d => {
      if(d.start.isBefore(startDate)) d.start = startDate;
      d.end = lastDay;
    });

    // apply adjustments
    this.adjData();

    this.setState({ 
      activeData: this.trimData([DATE_OPTS[0].start, DATE_OPTS[0].end]), 
      activeDates: [DATE_OPTS[0].start, DATE_OPTS[0].end],
      accounts, 
      activeAccount, 
      lastDay,
      encrypted: false,
    }, () => {
      this.meta.loginAnime = anime({
        targets: this.refs.unlock,
        opacity: [1,0],
        easing: 'easeOutQuad',
        duration: LOGIN_ANIM_DURATION / 2,
        complete: anim => this.setState({ showUnlock: false })
      });
    });    
  }

  hideUnlockError = e => {
    e.target.classList.add('hide');
    this.refs.unlockInput.focus()
    setTimeout(() => this.setState({ unlockError: '' }), 150);
  }

  // trims active data to relevant dates, and meta
  trimData = dates => {
    dates = dates || this.state.activeDates;
    const { acctData } = this.meta;
    const data = { meta: acctData.meta };
    for(const day = dates[0].clone(); day.isSameOrBefore(dates[1], 'days'); day.add(1, 'days')) {
      const formatted = day.format('L');
      data[formatted] = acctData[formatted];
    }
    return data;
  }

  adjData = adj => {
    const { acctData: data } = this.meta;
    const {
      feeAdjustments: fee,
      // dataView: view,
      contributionAdjustments: contrib
    } = adj || this.state;
    const day = moment(data.meta.last_updated, 'L'),
          start = moment(data.meta.start_date, 'L');
    let tcontrib;
    while(day.isSameOrAfter(start, 'days')) {
      const d = data[day.format('L')]
      if(d) {
        if(!tcontrib) tcontrib = d.total_contributions;
        adj = {
          balance: d.balance,
          cash_balance: d.cash_balance,
          total_contributions: d.total_contributions
        };
        if(!fee) {
          adj.balance += d.total_fees;
          adj.cash_balance += d.total_fees;
        }
        if(contrib) {
          adj.balance += (tcontrib - d.total_contributions);
          adj.cash_balance += (tcontrib - d.total_contributions);
          adj.total_contributions = tcontrib;
        }
        adj.pl = adj.balance - adj.total_contributions;
        adj.plPerc = (adj.balance - adj.total_contributions) / adj.total_contributions * 100;
        // if(view === '$') {
        // }
        // if(view === '%') {
        // }
        d.adj = adj;
      }
      day.subtract(1, 'days');
    }
  }

  onDateChange = (type, val, callback) => {
    const isOpt = type === 'opt';
    let activeDateOpt = isOpt ? val : -1,
        activeDates = isOpt ? [DATE_OPTS[val].start, DATE_OPTS[val].end] : val;
    // check if date is valid
    while(!this.meta.acctData[activeDates[0].format('L')]) activeDates[0].add(1, 'days');
    while(!this.meta.acctData[activeDates[1].format('L')]) activeDates[1].subtract(1, 'days');
    // check if dates are same as opt
    if(!isOpt) {
      DATE_OPTS.forEach((d,i) => {
        if(activeDateOpt > -1) return;
        if(d.start.isSame(activeDates[0], 'days') && d.end.isSame(activeDates[1], 'days')) activeDateOpt = i;
      })
    }
    const activeData = this.trimData(activeDates);

    this.setState({ 
      activeDateOpt,
      activeDates,
      activeData
    }, callback);
  }

  onSettingsChange = (key, val) => {
    this.adjData({...this.state, [key]: val})
    this.setState({ [key]: val });
  }

  render = () => {
    const isMobile = MOBILE_DEV || window.screen.width <= 767;
    const interfaceProps = this.state.encrypted ? {} : {
      data: this.state.activeData,
      history: this.meta.acctData,
      
      lastDay: this.state.lastDay,
      dateOpts: DATE_OPTS,
      activeDateOpt: this.state.activeDateOpt,
      activeDates: this.state.activeDates,
      onDateChange: this.onDateChange,

      dataView: this.state.dataView,
      feeAdjustments: this.state.feeAdjustments,
      contributionAdjustments: this.state.contributionAdjustments,
      onSettingsChange: this.onSettingsChange,
    }
    console.log('rendering...')
    return (
      <div 
        className={`app ${isMobile ? 'mobile' : ''} ${MOBILE_DEV ? 'dev' : ''}`} 
        id="app"
        key={this.state.mobileOrientation}
        style={{background: 'rgba(0,0,0,.15)'}}
      >
        {
          !this.state.showUnlock ? null : 
          <div ref="unlock" className="unlock">
            <img className="logo" alt="" src={require('./static/logo.svg')}/>
            <ContentEditable
              ref="unlockInput"
              className="input"
              onKeyDown={e => { if(IS_ENTER(e)) this.unlock(e.target.textContent) }}
            />
            {
              !this.state.unlockError ? null :
              <div className="unlock-error" onClick={this.hideUnlockError}>{this.state.unlockError}</div>
            }
          </div>
        }
        { 
          this.state.encrypted ? null : 
          isMobile ? <InterfaceMobile {...interfaceProps}/> : <Interface {...interfaceProps}/> 
        }
        <div className="rotate">{rotatephone}</div>
      </div>
    )
  }
}

// ========================================

ReactDOM.render(
  <App />,
  document.getElementById('root')
);