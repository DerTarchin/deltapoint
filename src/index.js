import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { decrypt } from './utils/decrypt';

const REQUEST = require('request');
const IS_ENTER = e => (e.key || e.keyCode) === 'Enter' || e.which === 13;

class App extends Component {
  state = {
    data: '',
    encrypted: true
  };

  componentDidMount = () => {
    REQUEST('http://hizalcelik.com/dev/deltapoint.appdata.encrypted.json', (error, response, body) => {
      if(error) console.log('error:', error);
      this.setState({ data: JSON.parse(body).encryptedMsg });
    });
  }

  sendPassphrase = passphrase => {
    if(!this.state.data) {
      alert("unable to retreive data from server");
      return
    }
    const data = decrypt(this.state.data, passphrase);
    if(!data) {
      alert("unable to decrypt data");
      return
    }
    this.setState({ data, encrypted: false });
  }



  render = () => {
    return (
      <div>
        <div>HEY THERE</div>
          <input
            type="password"
            onKeyDown={e => {
              if(IS_ENTER(e)) this.sendPassphrase(e.target.value);
            }}
          />
          {
            this.state.encrypted ? null : <div>{this.state.data}</div>
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