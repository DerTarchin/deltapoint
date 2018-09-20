import React, { Component } from 'react';
import anime from 'animejs';
import moment from 'moment';
import { 
  Portfolio, 
  Balances, 
  Volatility, 
  Breakdown, 
  Charts 
} from './components';
import {
  pagePos,
  frmt,
  sepFrmt
} from './utils'
import {
  threedot,
  doublearrow
} from './utils/icons';

require('./interface.css');

const TILE_INTRO_DURATION = 1000;
const TILE_INTRO_DELAY = 100;
const SCRUBBER_TICK = 2;

export default class Interface extends Component {
  constructor(props) {
    super(props);
    const ad = props.activeDates;
    this.state = {
      headerIndex: 0,
      scrubberYear: 2018,
      highlightDate: ad[0] === ad[1] ? frmt(ad[0]) : `${frmt(ad[0], ad[1])[0]} - ${frmt(ad[0], ad[1])[1]}`
    };
    this.meta = {};
  }

  componentWillMount = () => {
    window.addEventListener('resize', this.handleResize);
  }

  componentDidMount = () => {
    const isSmall = window.innerWidth <= 767;
    this.drawScrubber();
    this.meta.tileAnime = anime.timeline().add({
      targets: isSmall ?
      [
        '#portfolio',
        '#balances',
        '#volatility',
        '#breakdown',
        '#charts',
      ] : [
        '#portfolio',
        '#breakdown',
        '#balances',
        '#charts',
        '#volatility',
      ],
      opacity: [0,1],
      scale: [.8, 1],
      easing: 'easeInOutSine',
      duration: TILE_INTRO_DURATION,
      delay: (el, i, l) => i * TILE_INTRO_DELAY
    }).add({
      targets: this.refs.header,
      opacity: [0,1],
      easing: 'easeInOutSine',
      duration: TILE_INTRO_DURATION,
      offset: TILE_INTRO_DELAY * 2
    });
  }

  componentDidUpdate = () => {
    // move date opt background
    const { activeDateOpt } = this.props;
    const bg = this.refs.dateOptBg;
    if(!this.meta.loaded || parseFloat(bg.getAttribute('data-index')) !== activeDateOpt) {
      if(activeDateOpt < 0) bg.style.opacity = 0;
      else {
        const opt = this.refs.dateOpts.querySelectorAll('[data-opt]')[activeDateOpt].getBoundingClientRect();
        const offset = this.refs.dateOpts.getBoundingClientRect().left;
        bg.style.opacity = 1;
        bg.style.width = opt.width+'px';
        bg.style.height = opt.height+'px';
        bg.style.left = (opt.left - offset) +'px';
      }
    }
    this.meta.loaded = true;
  }

  componentWillUnmount = () => {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = e => {
    this.meta.canvas = null;
  }

  drawScrubber = () => {
    if(this.state.headerIndex !== 1) return;
    const { canvas } = this.refs, rect = canvas.getBoundingClientRect();
    // init canvas if initial render 
    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      this.meta.canvas = canvas.getContext('2d');
      this.meta.canvas.scale(dpr, dpr);
      return this.meta.canvas;
    }
    const setupTicks = () => {
      const weekdays = {
        list: [],
        year: this.state.scrubberYear
      };
      const time = moment();
      while(weekdays.list.length < 90) {
        if(time.weekday() < 6) weekdays.list.unshift(time.format('MM/DD/YYYY'));
        time.subtract(1, 'days');
      }
      this.meta.weekdays = weekdays;
      this.forceUpdate();
      return weekdays;
    }

    // if weekdays have not been initialized or year changed
    const weekdays = this.meta.weekdays || setupTicks();
    // draw calendar
    const ctx = this.meta.canvas || setupCanvas();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const distance = this.calcTickDistance();
    const offset = SCRUBBER_TICK; // first one gets drawn in half
    // ctx.globalAlpha = 0.2;
    weekdays.list.forEach((day, i) => {
      ctx.lineWidth = SCRUBBER_TICK;
      ctx.beginPath();
      if(i === this.meta.canvasHighlight) {
        ctx.strokeStyle = '#fff'
        ctx.moveTo(distance * i + offset, 0);
        ctx.lineTo(distance * i + offset, rect.height);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.moveTo(distance * i + offset, rect.height * .25);
        ctx.lineTo(distance * i + offset, rect.height * .75);
      }
      ctx.stroke();
    })
  }

  calcTickDistance = () => {
    const days = this.meta.weekdays.list.length;
    const { canvas } = this.refs, rect = canvas.getBoundingClientRect();
    let distance = rect.width / days;
    // recalc width to get rid of empty space at back
    const calcWidth = rect.width + distance - (SCRUBBER_TICK * 2);

    return calcWidth / days;
  }

  scrub = e => {
    // calc hover highlight
    const { canvas, scrubber } = this.refs;
    if(e.target === canvas) {
      const width = canvas.getBoundingClientRect().width,
            distance = this.calcTickDistance(), offset = SCRUBBER_TICK * .5,
            canvasPos = pagePos(canvas);
      canvasPos.y = canvasPos.y - document.getElementById('header-cal').clientHeight;
      const highlight = Math.floor((e.pageX - canvasPos.x + offset) / distance);
      if(this.meta.canvasHighlight === highlight) return;
      const day = moment(this.meta.weekdays.list[highlight], 'MM/DD/YYYY');
      if(!this.meta.propActiveDates) {
        this.meta.propActiveDates = this.props.activeDates;
        this.meta.propActiveDateOpt = this.props.activeDateOpt;
      }
      this.props.onDateChange('range', [day, day]);
      this.setState({ 
        highlightDate: frmt(day, moment())[0],
      });
      this.meta.canvasHighlight = highlight;
      this.drawScrubber();
    }
    else if(this.meta.canvasHighlight > -1) {
      this.setState({ highlightDate: null });
      // if(this.meta.propActiveDates) {
        if(this.meta.propActiveDateOpt > -1) this.props.onDateChange('opt', this.meta.propActiveDateOpt);
        else this.props.onDateChange('range', this.meta.propActiveDates);
        this.meta.propActiveDateOpt = -1;
        this.meta.propActiveDates = null;
      // }
      this.meta.canvasHighlight = -1;
      this.drawScrubber();
    }
  }

  render = () => {
    const { 
      headerIndex,
      highlightDate
    } = this.state;
    const {
      weekdays // hover
    } = this.meta;

    const dateFrom = this.props.activeDates[0],
          dateTo = this.props.activeDates[1],
          formatted = frmt(dateFrom, dateTo),
          datesRender = highlightDate || (dateFrom === dateTo ? formatted[0] : `${formatted[0]} - ${formatted[1]}`);

    return (
      <div className="interface">
        <div className="bg" />
        
        <div ref="header" className="interface-header">
          <div className="header-slider" data-slide={headerIndex}>
            <section id="header-basic">
              <img className="logo" alt="" src={require('./static/logo.svg')}/>
              <div className="header-right">
                <ul ref="dateOpts" className="date-opts">
                  <div ref="dateOptBg" className="bg" data-index={-1} />
                  {
                    this.props.dateOpts.map((opt, i) => {
                      const active = this.props.activeDateOpt === i,
                            formatted = frmt(opt.start, opt.end);
                      const range = `${formatted[0]} - ${formatted[1]}`;
                      return <li 
                        key={i}
                        className={active ? 'active' : ''}
                        data-opt={i}
                        title={range}
                        onClick={active ? null : () => this.props.onDateChange('opt', i)}
                      ><div className="clickitem">{opt.range_count}<span>{opt.range_type}</span></div></li>
                    })
                  }
                </ul>
              </div>
            </section>
            <section id="header-cal" onMouseMove={this.scrub}>
              <div className="dates">{datesRender}</div>
              <div className="scrubber" ref="scrubber">
                <canvas ref="canvas" onClick={this.scrubSelect} />
                <div className="arrow backwards"><span className="clickitem">{doublearrow}</span></div>
                <div className="arrow forwards"><span className="clickitem">{doublearrow}</span></div>
                {
                  !weekdays ? null : [
                    <div key="from" className="from">{frmt(moment(weekdays.list[0], 'MM/DD/YYYY'), moment(weekdays.list[weekdays.list.length-1], 'MM/DD/YYYY'))[0]}</div>,
                    <div key="to" className="to">{frmt(moment(weekdays.list[0], 'MM/DD/YYYY'), moment(weekdays.list[weekdays.list.length-1], 'MM/DD/YYYY'))[1]}</div>
                  ]
                }
              </div>
            </section>
          </div>
          <div
            className="menu-icon"
            onClick={() => {
              this.setState({ headerIndex: (headerIndex + 1) % 2}, this.drawScrubber);
            }}
          ><div className="clickitem">{threedot}</div></div>
        </div>

        <div className="interface-content" onMouseEnter={this.scrub}>
          <section className="tile-col left">
            <Portfolio {...this.props} />
            <Balances {...this.props} />
            <Volatility {...this.props} />
          </section>
          <section className="tile-col right">
            <Breakdown {...this.props} />
            <Charts {...this.props} />
          </section>
        </div>
      </div>
    )
  }

}