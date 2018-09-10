import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { ContentEditable } from './components';
import { decrypt } from './utils/decrypt';
import anime from 'animejs'

require('./app.css');

const REQUEST = require('request');
const DATA_URL = 'http://hizalcelik.com/dev/deltapoint.appdata.encrypted.json';
const IS_ENTER = e => (e.key || e.keyCode) === 'Enter' || e.which === 13;

class App extends Component {
  state = {
    data: '',
    encrypted: true,
    unlockError: ''
  };
  meta = {}

  componentDidMount = () => {
    // retrieve encrypted data
    REQUEST(DATA_URL, (error, response, body) => {
      if(error) console.log('error:', error);
      this.setState({ data: JSON.parse(body).encryptedMsg });
    });
    // activate anime.js for unlock dialog
    this.meta.loginAnime = anime({
      targets: this.refs.unlock,
      opacity: [0,1],
      easing: 'easeInExpo',
      duration: 1000
    });
    this.refs.unlockInput.focus();
  }

  unlock = passphrase => {
    if(!passphrase || !this.state.encrypted) return this.refs.unlockInput.focus();
    if(!this.state.data) {
      this.refs.unlockInput.focus();
      this.setState({ unlockError: 'Unable to retrieve data.'})
      return;
    }
    const data = decrypt(this.state.data, passphrase);
    if(!data) {
      this.refs.unlockInput.clearContent();
      this.refs.unlockInput.focus();
      this.setState({ unlockError: 'Incorrect passphrase.'})
      return;
    }
    this.setState({ data, encrypted: false });
    this.meta.loginAnime.reverse();
    this.meta.loginAnime.play();
  }

  hideUnlockError = e => {
    e.target.classList.add('hide');
    this.refs.unlockInput.focus()
    setTimeout(() => this.setState({ unlockError: '' }), 150);
  }

  render = () => {
    return (
      <div>
        <div ref="unlock" className="unlock">
          <img className="logo" alt="" src={require('./static/logo.svg')}/>
          <ContentEditable
            ref="unlockInput"
            className="input"
            // onBlur={() => this.refs.unlockInput.focus()}
            onKeyDown={e => { if(IS_ENTER(e)) this.unlock(e.target.textContent) }}
          />
          {
            !this.state.unlockError ? null :
            <div className="unlock-error" onClick={this.hideUnlockError}>{this.state.unlockError}</div>
          }
        </div>
      </div>
    )
  }
}

// ========================================

ReactDOM.render(
  <App />,
  document.getElementById('root')
);