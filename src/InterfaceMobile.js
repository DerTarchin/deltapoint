import React, { Component } from 'react';
import anime from 'animejs';
import Swipe from 'swipejs';
import { 
  Portfolio, 
  Balances, 
  Volatility, 
  Breakdown, 
  Charts 
} from './components';

require('./interface.css');

const TILE_INTRO_DURATION = 500;
const TILE_INTRO_DELAY = 200;

export default class InterfaceMobile extends Component {
  state = {};
  meta = {
    swipe: {
      acctIndex: 1,
      posIndex: 1
    }
  }

  componentDidMount = () => {
    const processSlides = (index, slides) => {
      const width = parseFloat(slides[0].style.width);
      slides[index].children[0].style.transform = 'scale(1)';
      
      // scrolling to the first, 2+ should be hidden
      if(!index) {
        for(let i=index+2; i<slides.length; i++) {
          slides[i].style.transform = `translate(${width * 2}px, 0px) translateZ(0px)`;
          slides[i].style.transitionDuration = '400ms';
          slides[i].children[0].style.transform = 'scale(.8)';
          slides[i].children[0].style.transformOrigin = 'left center';
        }
        slides[1].children[0].style.transform = 'scale(.8)';
        slides[1].children[0].style.transformOrigin = 'left center';
      }
      // scrolling to anything after second slide, anything before previous should be hidden
      if(index > 1) {
        for(let i=index-2; i>=0; i--) {
          slides[i].style.transform = `translate(${width * -2}px, 0px) translateZ(0px)`;
          slides[i].style.transitionDuration = '400ms';
          slides[i].children[0].style.transform = 'scale(.8)';
          slides[i].children[0].style.transformOrigin = 'right center';
        }
        slides[index-1].children[0].style.transform = 'scale(.8)';
        slides[index-1].children[0].style.transformOrigin = 'right center';
      }
      if(index === 1) {
        slides[0].style.transform = `translate(${width * -1}px, 0px) translateZ(0px)`;
        slides[0].style.transitionDuration = '400ms';
        slides[0].children[0].style.transform = 'scale(.8)';
        slides[0].children[0].style.transformOrigin = 'right center';
        if(slides[2]) {
          slides[2].style.transform = `translate(${width}px, 0px) translateZ(0px)`;
          slides[2].style.transitionDuration = '400ms';
          slides[2].children[0].style.transform = 'scale(.8)';
          slides[2].children[0].style.transformOrigin = 'left center';
        }
      }
    }

    // init Swipe instances
    this.meta.swipe.acct = new Swipe(this.refs.account, {
      startSlide: this.meta.swipe.acctIndex,
      speed: 400,
      draggable: true,
      continuous: false,
      disableScroll: true,
      stopPropagation: true,
      callback: (index, el, dir) => {
        this.meta.swipe.acctIndex = index;
        processSlides(index, [...this.refs.account.querySelectorAll('.swipe-wrap > div')]);
      },
    });
    this.meta.swipe.pos = new Swipe(this.refs.positions, {
      startSlide: this.meta.swipe.posIndex,
      speed: 400,
      draggable: true,
      continuous: false,
      disableScroll: true,
      stopPropagation: true,
      callback: (index, el, dir) => {
        this.meta.swipe.posIndex = index;
        processSlides(index, [...this.refs.positions.querySelectorAll('.swipe-wrap > div')])
      },
    });

    //initialize transforms
    processSlides(this.meta.swipe.acctIndex, [...this.refs.account.querySelectorAll('.swipe-wrap > div')]);
    processSlides(this.meta.swipe.posIndex, [...this.refs.positions.querySelectorAll('.swipe-wrap > div')]);

    // animate in
    this.meta.tileAnime = anime.timeline().add({
      targets: [
        '#balances',
        '#charts',
      ],
      opacity: [0,1],
      marginTop: [20,0],
      // scale: [.8, 1],
      easing: 'easeInOutSine',
      duration: TILE_INTRO_DURATION,
      delay: (el, i, l) => i * TILE_INTRO_DELAY
    }).add({
      targets: [
        '#portfolio',
        '#volatility',
        '#breakdown'
      ],
      opacity: [0,1],
      // scale: [.8, 1],
      offset: '-='+TILE_INTRO_DURATION,
      easing: 'easeInOutSine',
      duration: TILE_INTRO_DURATION,
      delay: (el, i, l) => i * TILE_INTRO_DELAY
    });
  }

  render = () => {
    return (
      <div className="interface">
        <div className="bg" />

        <div className="interface-header">
          <div className="date">{this.props.activeDateRangeOpt[0]}<span>{this.props.activeDateRangeOpt[1]}</span></div>
        </div>

        <div className="interface-content">
          <section>
            <div className="swipe-shrink">
              <div ref="account" className="swipe">
                <div className="swipe-wrap">
                  <div style={{transform: 'scale(0.8)', transformOrigin: 'right center'}}><Portfolio mobile data={this.props.data} /></div>
                  <div><Balances mobile data={this.props.data} /></div>
                  <div style={{transform: 'scale(0.8)', transformOrigin: 'left center'}}><Volatility mobile data={this.props.data} /></div>
                </div>
              </div>
            </div>
          </section>
          <section>
            <div className="swipe-shrink">
              <div ref="positions" className="swipe">
                <div className="swipe-wrap">
                  <div style={{transform: 'scale(0.8)', transformOrigin: 'right center'}}><Breakdown mobile data={this.props.data} /></div>
                  <div><Charts mobile data={this.props.data} /></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

}