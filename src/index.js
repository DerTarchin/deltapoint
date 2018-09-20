import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { ContentEditable } from './components';
import Interface from './Interface'
import InterfaceMobile from './InterfaceMobile'
import { decrypt } from './utils';
import anime from 'animejs';
import moment from 'moment';

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
      if(error) console.log('error:', error);
      this.meta.encryptedMsg = JSON.parse(body).encryptedMsg;
      // dev
      setTimeout(() => this.unlock('ord-mantell'), 500);
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
    this.setState({ 
      data: data[activeAccount], 
      accounts, 
      activeAccount, 
      encrypted: false 
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

  onDateChange = (type, val) => {
    // console.log(type, val);
    if(type === 'opt') {
      this.setState({ 
        activeDateOpt: val, 
        activeDates: [DATE_OPTS[val].start, DATE_OPTS[val].end] 
      });
    }
    else {
      this.setState({
        activeDateOpt: -1,
        activeDates: val
      })
    }
  }

  render = () => {
    // const isMobile = true; 
    const isMobile = window.screen.width <= 767;
    const interfaceProps = this.state.encrypted ? {} : {
      data: this.state.data,
      dateOpts: DATE_OPTS,
      activeDateOpt: this.state.activeDateOpt,
      activeDates: this.state.activeDates,
      onDateChange: this.onDateChange,
    }

    return (
      <div className={`app ${isMobile ? 'mobile' : ''}`}>
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
      </div>
    )
  }
}

// ========================================

ReactDOM.render(
  <App />,
  document.getElementById('root')
);