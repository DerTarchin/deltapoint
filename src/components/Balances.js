import React, { Component } from 'react';

require('./balances.css');

export default class Balances extends Component {
  state = {};
  meta = {}

  componentDidMount = () => {
    // console.log(this.props)
  }

  toggle = () => {}

  render = () => {
    const { data } = this.props;
    return (
      <div className="tile-container" id="balances">
        <div className="tile">
          BALANCES<br/><br/>
          {
            this.props.activeDates[0] === this.props.activeDates[1] ? 
            this.props.activeDates[0].format('MMM DD, YYYY') :
            `${this.props.activeDates[0].format('MMM DD, YYYY')} - ${this.props.activeDates[1].format('MMM DD, YYYY')}`
          }
        </div>
      </div>
    )
  }
}