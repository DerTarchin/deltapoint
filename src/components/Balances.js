import React, { Component } from 'react';

// require('./interface.css');

export default class Balances extends Component {
  state = {};
  meta = {}

  componentDidMount = () => {}

  toggle = () => {}

  render = () => {
    return (
      <div className="tile-container" id={this.props.id}>
        <div className="tile">Hello World</div>
      </div>
    )
  }
}