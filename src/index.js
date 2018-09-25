import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { ContentEditable } from './components';
import Interface from './Interface'
import InterfaceMobile from './InterfaceMobile'
import { decrypt, debounce } from './utils';
import anime from 'animejs';
import moment from 'moment';
import {
  rotatephone,
} from './utils/icons';

require('./app.css');

const REQUEST = require('request');
const DATA_URL = 'http://hizalcelik.com/dev/deltapoint.appdata.encrypted.json';
const IS_ENTER = e => (e.key || e.keyCode) === 'Enter' || e.which === 13;

const LOGIN_ANIM_DURATION = 1000;

const NOW = moment();
const DATE_OPTS = [
  {
    range_count: '1',
    range_type: 'M',
    start: NOW.clone().subtract(1, 'months'),
    end: NOW,
  },
  {
    range_count: '3',
    range_type: 'M',
    start: NOW.clone().subtract(3, 'months'),
    end: NOW,
  },
  {
    range_count: '6',
    range_type: 'M',
    start: NOW.clone().subtract(6, 'months'),
    end: NOW,
  },
  {
    range_count: '1',
    range_type: 'Y',
    start: NOW.clone().subtract(12, 'months'),
    end: NOW,
  }
];

class App extends Component {
  state = {
    // app init
    data: null,
    encrypted: true,
    unlockError: '',
    showUnlock: true,

    // app settings
    activeDateOpt: 0,
    activeDates: [DATE_OPTS[0].start, DATE_OPTS[0].end],
  };
  meta = {}

  componentWillMount = () => {
    // disable overscroll on mobile
    document.addEventListener('touchmove', e => e.preventDefault(), false);
  }

  componentDidMount = () => {
    // retrieve encrypted data
    REQUEST(DATA_URL, (error, response, body) => {
      if(error || !body) alert.log('Error: ' + error);
      this.meta.encryptedMsg = JSON.parse(body).encryptedMsg;
      // dev
      
    });
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

    // parse data
    const accounts = Object.keys(data),
          activeAccount = accounts[0];
    this.meta.decryptedMsg = data;
    this.meta.acctData = data[activeAccount];
    
    // reset date ranges
    const lastUpdated = moment(this.meta.acctData.meta.last_updated, 'L');
    while(!lastUpdated.day() || lastUpdated.day() === 6) lastUpdated.subtract(1, 'days');
    const startDate = moment(this.meta.acctData.meta.start_date, 'L');
    DATE_OPTS[0].start = lastUpdated.clone().subtract(1,'months');
    DATE_OPTS[1].start = lastUpdated.clone().subtract(3,'months');
    DATE_OPTS[2].start = lastUpdated.clone().subtract(6,'months');
    DATE_OPTS[3].start = lastUpdated.clone().subtract(1,'years');
    DATE_OPTS.forEach(d => {
      // if(d.start.isBefore(startDate)) d.start = startDate;
      d.end = lastUpdated;
    });

    this.setState({ 
      activeData: this.updateData(), 
      accounts, 
      activeAccount, 
      lastUpdated,
      activeDates: [DATE_OPTS[0].start, DATE_OPTS[0].end],
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

  updateData = dates => {
    dates = dates || this.state.activeDates;
    const { acctData } = this.meta;
    const data = { meta: acctData.meta };
    for(const day = dates[0].clone(); day.isSameOrBefore(dates[1]); day.add(1, 'days')) {
      const formatted = day.format('L');
      data[formatted] = acctData[formatted];
    }
    return data;
  }

  onDateChange = (type, val) => {
    debounce(() => {
      const isOpt = type === 'opt',
            activeDateOpt = isOpt ? val : -1,
            activeDates = isOpt ? [DATE_OPTS[val].start, DATE_OPTS[val].end] : val;
      const activeData = this.updateData(activeDates);

      this.setState({ 
        activeDateOpt,
        activeDates,
        activeData
      });
    }, 0);
  }

  render = () => {
    // const isMobile = true; 
    const isMobile = window.screen.width <= 767;
    const interfaceProps = this.state.encrypted ? {} : {
      data: this.state.activeData,
      lastUpdated: this.state.lastUpdated,
      dateOpts: DATE_OPTS,
      activeDateOpt: this.state.activeDateOpt,
      activeDates: this.state.activeDates,
      onDateChange: this.onDateChange,
    }

    return (
      <div 
        className={`app ${isMobile ? 'mobile' : ''}`} 
        id="app"
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