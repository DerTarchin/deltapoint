import React, { Component } from 'react';
import anime from 'animejs';
import { 
  Portfolio, 
  Balances, 
  Volume, 
  Breakdown, 
  Charts 
} from './components';

require('./interface.css');

const TILE_INTRO_DURATION = 200;
const TILE_INTRO_DELAY = 100;

export default class Interface extends Component {
  state = {};
  meta = {}

  componentDidMount = () => {
    this.meta.tileAnime = anime({
      targets: [
        '#portfolio',
        '#breakdown',
        '#balances',
        '#charts',
        '#volume',
      ],
      opacity: [0,1],
      translateY: [20,0],
      easing: 'linear',
      duration: TILE_INTRO_DURATION,
      delay: (el, i, l) => i * TILE_INTRO_DELAY
    });
  }

  // toggle = () => this.setState(state => ({ toggle: !state.toggle }))
  toggle = () => {
    this.refs.accountAnim.reverse();
    this.refs.analysisAnim.reverse();
  }

  render = () => {
    return (
      <div className="interface">
        <div className="interface-header">
          header
        </div>
        <div className="interface-content">
          <div className="tile-col left">
            <Portfolio id="portfolio"/>
            <Balances id="balances"/>
            <Volume id="volume"/>
          </div>
          <div className="tile-col right">
            <Breakdown id="breakdown"/>
            <Charts id="charts"/>
          </div>
        </div>
      </div>
    )
  }

}