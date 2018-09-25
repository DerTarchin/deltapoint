import React, { Component } from 'react';
import anime from 'animejs';
import Swipe from 'swipejs';
import moment from 'moment';
import { 
  Portfolio, 
  Balances, 
  Volatility, 
  Breakdown, 
  Charts 
} from './components';
import {
  frmt,
  sepFrmt,
  getAlpha,
  p5map,
} from './utils';
import {
  angle,
} from './utils/icons';

require('./interface.css');

const TILE_INTRO_DURATION = 500;
const TILE_INTRO_DELAY = 200;
const MENU_BG = 0.6;

export default class InterfaceMobile extends Component {
  state = {};
  meta = {
    swipe: {
      acctIndex: 1,
      posIndex: 1
    }
  }

  componentWillMount = () => {
    this.meta.app = document.getElementById('app');
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
      offset: '-='+TILE_INTRO_DURATION,
      easing: 'easeInOutSine',
      duration: TILE_INTRO_DURATION,
      delay: (el, i, l) => i * TILE_INTRO_DELAY
    });
  }

  componentWillReceiveProps = props => {
    // animation of dates in the menu when adjusting dates
    if(this.refs.menu.classList.contains('show')) {
      const fromElDay = this.refs.menu.querySelector('.from .big'),
            fromElRest = this.refs.menu.querySelector('.from .small'),
            toElDay = this.refs.menu.querySelector('.to .big'),
            toElRest = this.refs.menu.querySelector('.to .small');
      const fromStartDate = moment(`${fromElRest.textContent} ${fromElDay.textContent}`, 'MMM YYYY DD'),
            toStartDate = moment(`${toElRest.textContent} ${toElDay.textContent}`, 'MMM YYYY DD');
      const fromDiff = props.activeDates[0].diff(fromStartDate, 'days'),
            toDiff = props.activeDates[1].diff(toStartDate, 'days');
      const diffs = { fromdiff: 0, todiff: 0, fromdiffhistory: 0, todiffhistory: 0 };
      this.meta.dateMenuAnim = anime({
        targets: diffs, 
        fromdiff: fromDiff,
        todiff: toDiff,
        easing: 'easeOutExpo',
        round: 1,
        duration: 1000,
        update: () => {
          fromElDay.innerHTML = fromStartDate.clone().add(diffs.fromdiff, 'days').date();
          fromElRest.innerHTML = fromStartDate.clone().add(diffs.fromdiff, 'days').format('MMM YYYY');
          toElDay.innerHTML = toStartDate.clone().add(diffs.todiff, 'days').date();
          toElRest.innerHTML = toStartDate.clone().add(diffs.todiff, 'days').format('MMM YYYY');
        }
      })
    }
  }

  moveHeaderStart = e => {
    if(!e || (!e.pageY && !e.touches)) return;
    const y = e.pageY || (e.touches[0].clientY - 20);
    this.refs.menu.style.transitionDuration = '0s';
    this.refs.interface.style.transitionDuration = '0s';
    this.meta.app.style.transitionDuration = '0s';
    this.refs.menu.style.transitionTimingFunction = null;
    this.refs.interface.style.transitionTimingFunction = null;
    if(!this.meta.app.hasAttribute('data-bg')) {
      this.meta.app.setAttribute('data-bg', this.meta.app.style.background);
    }
    this.meta.drag = {
      y,
      alpha: getAlpha(this.meta.app.getAttribute('data-bg')),
      menuOpen: this.refs.menu.classList.contains('show'),
      time: performance.now()
    }
  }

  moveHeader = e => {
    const { drag } = this.meta;
    if(!drag || !e || (!e.pageY && !e.touches)) return;
    e.preventDefault();
    const y = e.pageY || (e.touches[0].clientY - 20);
    if(y < 0) return;
    if(drag.menuOpen) { // relative to start point
      drag.diff = drag.y - y;
      if(drag.diff < 0) {
        drag.diff = 0;
        drag.y = y;
        drag.time = performance.now();
      }
      this.refs.menu.style.top = `-${drag.diff}px`;
      this.refs.interface.style.top = `calc(100vh - ${drag.diff}px)`;
      const appbg = p5map(drag.diff, 0, window.screen.height, MENU_BG, drag.alpha);
      this.meta.app.style.background = `rgba(0,0,0,${appbg})`;
    } else { // exact position on screen
      this.refs.interface.style.top = y + 'px';
      this.refs.menu.style.top = `calc(-100vh + ${y}px)`;
      const appbg = p5map(y, 0, window.screen.height, drag.alpha, MENU_BG);
      this.meta.app.style.background = `rgba(0,0,0,${appbg})`;
    }
  }

  moveHeaderEnd = e => {
    if(!this.meta.drag) return;
    const fast = performance.now() - this.meta.drag.time < 200;
    if(this.meta.drag.menuOpen) { // hide menu
      if( (fast && this.meta.drag.diff > window.screen.height * 0.1) ||
          this.meta.drag.diff > window.screen.height / 4
      ) {
        this.hideMenu(fast);
      } else {
        this.refs.menu.style.transitionDuration = '0.1s'; // faster speed for short distance
        this.refs.interface.style.transitionDuration = '0.1s';
        this.meta.app.style.transitionDuration = '0.1s';
        this.refs.menu.style.top = 0;
        this.refs.interface.style.top = '100vh';
        this.meta.app.style.background = `rgba(0,0,0,${MENU_BG})`;
      }
    } else { // show menu
      if( (fast && parseFloat(this.refs.interface.style.top) >= window.screen.height / 5) ||
          parseFloat(this.refs.interface.style.top) >= window.screen.height / 3
      ) {
        this.showMenu(fast);
      } else {
        this.refs.menu.style.transitionDuration = '0.1s'; // faster speed for short distance
        this.refs.interface.style.transitionDuration = '0.1s';
        this.meta.app.style.transitionDuration = '0.1s';
        this.refs.menu.style.top = null;
        this.refs.interface.style.top = null;
        this.meta.app.style.background = `rgba(0,0,0,${this.meta.drag.alpha})`;
      }
    }
    this.meta.drag = null;
  }

  showMenu = fast => {
    if(fast) {
      this.refs.menu.style.transitionTimingFunction = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      this.refs.interface.style.transitionTimingFunction = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    } 
    this.refs.menu.style.transitionDuration = null; // slower, original speed
    this.refs.interface.style.transitionDuration = null;
    this.meta.app.style.transitionDuration = null;
    this.refs.menu.classList.add('show');
    this.refs.menu.style.top = 0;
    this.refs.interface.style.top = '100vh';
    this.meta.app.style.background = `rgba(0,0,0,${MENU_BG})`;
  }

  hideMenu = fast => {
    if(fast) {
      this.refs.menu.style.transitionTimingFunction = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      this.refs.interface.style.transitionTimingFunction = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }
    this.refs.menu.style.transitionDuration = null; // slower, original speed
    this.refs.interface.style.transitionDuration = null;
    this.meta.app.style.transitionDuration = null;
    this.refs.menu.classList.remove('show');
    this.refs.menu.style.top = null;
    this.refs.interface.style.top = null;
    this.meta.app.style.background = this.meta.app.getAttribute('data-bg');
  }

  dateChange = e => {
    if(!e.target.value) return;
    let dateFrom = moment(this.refs.from.value, 'YYYY-MM-DD'),
        dateTo = moment(this.refs.to.value, 'YYYY-MM-DD'),
        changed = e.target === this.refs.from ? 0 : 1;
    // limit dates
    const min = moment(this.props.data.meta.start_date, 'L'),
          max = moment(this.props.lastUpdated, 'L');
    if(dateFrom.isBefore(min)) dateFrom = min;
    if(dateTo.isAfter(max)) dateTo = max;
    let range = [dateFrom, dateTo];
    // keep in min -> max order
    if(dateFrom.isAfter(dateTo)) {
      if(changed) {
        if(dateTo.isBefore(min)) dateTo = min;
        range = [dateTo, dateTo];
      } else {
        if(dateFrom.isAfter(max)) dateFrom = max;
        range = [dateFrom, dateFrom];
      }
    }
    this.props.onDateChange('range', range);
  }

  render = () => {
    const dateFrom = this.props.activeDates[0],
          dateTo = this.props.activeDates[1],
          formatted = frmt(dateFrom, dateTo),
          sep = sepFrmt(dateFrom, dateTo),
          datesRender = (dateFrom === dateTo ? formatted[0] : `${formatted[0]} - ${formatted[1]}`);

    return [
      <div 
        className="interface" 
        key="interface"
        ref="interface"
        onTouchStart={this.moveHeaderStart} 
        onTouchMove={this.moveHeader} 
        onTouchEnd={this.moveHeaderEnd}
        onMouseDown={this.moveHeaderStart}
        onMouseMove={this.moveHeader}
        onMouseUp={this.moveHeaderEnd}
      >
        <div className="bg" />

        <div className="interface-header" ref="header" onClick={this.showMenu}>
          <div className="date">{datesRender}</div>
        </div>

        <div className="interface-content" ref="content">
          <section>
            <div className="swipe-shrink">
              <div ref="account" className="swipe">
                <div className="swipe-wrap">
                  <div style={{transform: 'scale(0.8)', transformOrigin: 'right center'}}><Portfolio mobile {...this.props} /></div>
                  <div><Balances mobile {...this.props} /></div>
                  <div style={{transform: 'scale(0.8)', transformOrigin: 'left center'}}><Volatility mobile {...this.props} /></div>
                </div>
              </div>
            </div>
          </section>
          <section>
            <div className="swipe-shrink">
              <div ref="positions" className="swipe">
                <div className="swipe-wrap">
                  <div style={{transform: 'scale(0.8)', transformOrigin: 'right center'}}><Breakdown mobile {...this.props} /></div>
                  <div><Charts mobile {...this.props} /></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>,
      <div
        className="mobile-menu"
        ref="menu"
        key="menu"
        onTouchStart={this.moveHeaderStart} 
        onTouchMove={this.moveHeader} 
        onTouchEnd={this.moveHeaderEnd}
        onMouseDown={this.moveHeaderStart}
        onMouseMove={this.moveHeader}
        onMouseUp={this.moveHeaderEnd}
      >
        <div className="date-pickers">
          <div className="from">
            <div className="text">
              <div className="big">{sep[0].d}</div>
              <div className="small">{sep[0].m} {sep[0].y}</div>
            </div>
            <input 
              key={this.props.activeDates[0].format('L')}
              ref="from"
              type="date" 
              onBlur={this.dateChange} 
              defaultValue={this.props.activeDates[0].format('YYYY-MM-DD')} 
            />
          </div>
          <div className="to">
            <div className="text">
              <div className="big">{sep[1].d}</div>
              <div className="small">{sep[1].m} {sep[1].y}</div>
            </div>
            <input 
              key={this.props.activeDates[1].format('L')}
              ref="to"
              type="date" 
              onBlur={this.dateChange} 
              defaultValue={this.props.activeDates[1].format('YYYY-MM-DD')} 
            />
          </div>
        </div>
        <div className="date-opts">
          {
            this.props.dateOpts.map((opt, i) => {
              const active = this.props.activeDateOpt === i;
              return <div 
                key={i}
                className={`opt ${active ? 'active' : ''}`}
                onClick={active ? null : () => this.props.onDateChange('opt', i)}
              >{opt.range_count}<span>{opt.range_type}</span></div>
            })
          }
        </div>
        <div className="hideBanner" onClick={this.hideMenu}>{angle}</div>
      </div>
    ]
  }

}